import crypto from 'crypto'
import type { ClockType } from '@@/types/attendance'

// LINE Webhook イベントの型（必要最小限）
interface LineTextMessage {
  type: 'message'
  replyToken: string
  source: { userId: string }
  message: { type: 'text', text: string }
}

interface LinePostbackEvent {
  type: 'postback'
  replyToken: string
  source: { userId: string }
  postback: { data: string }
}

interface LineFollowEvent {
  type: 'follow'
  replyToken: string
  source: { userId: string }
}

type LineEvent = LineTextMessage | LinePostbackEvent | LineFollowEvent | { type: string }

// ポストバックデータ → ClockType のマッピング
const POSTBACK_TO_CLOCK: Record<string, ClockType> = {
  'action=clock_in': 'clock_in',
  'action=clock_out': 'clock_out',
  'action=break_start': 'break_start',
  'action=break_end': 'break_end'
}

// テキストメッセージ → ClockType のマッピング
const TEXT_TO_CLOCK: Record<string, ClockType> = {
  '出勤': 'clock_in',
  'しゅっきん': 'clock_in',
  '退勤': 'clock_out',
  'たいきん': 'clock_out',
  '休憩': 'break_start',
  '休憩開始': 'break_start',
  '休憩終了': 'break_end',
  '戻りました': 'break_end'
}

export default defineEventHandler(async (event) => {
  // LINE は常に 200 を要求するため、エラーは throw せず内部処理する
  const config = useRuntimeConfig()
  const channelSecret = config.lineChannelSecret
  const body = await readRawBody(event)
  const signature = getHeader(event, 'x-line-signature')

  if (!body || !signature) {
    console.warn('[webhook] missing body or signature')
    return { ok: false }
  }

  // 署名検証
  const hash = crypto
    .createHmac('SHA256', channelSecret)
    .update(body)
    .digest('base64')
  if (hash !== signature) {
    console.warn('[webhook] invalid signature')
    return { ok: false }
  }

  const payload = JSON.parse(body) as { events: LineEvent[] }

  // イベントが空（Webhook URL 疎通確認）はそのまま 200 返却
  if (payload.events.length === 0) {
    return { ok: true }
  }

  try {
    const db = useAdminFirestore()
    const baseUrl = config.public.baseUrl
    await Promise.all(payload.events.map(e => handleEvent(e, db, config.lineChannelAccessToken, baseUrl)))
  }
  catch (err) {
    console.error('[webhook] event handling error:', err)
  }

  return { ok: true }
})

async function handleEvent(
  event: LineEvent,
  db: FirebaseFirestore.Firestore,
  accessToken: string,
  baseUrl: string
) {
  if (event.type === 'follow') {
    const e = event as LineFollowEvent
    const registerUrl = `${baseUrl}/api/register/start`
    await replyMessage(accessToken, e.replyToken, [
      {
        type: 'text',
        text: `勤怠管理システムへようこそ！\n\n以下のリンクからアカウント登録をしてください👇\n${registerUrl}`
      }
    ])
    return
  }

  if (event.type === 'message') {
    const e = event as LineTextMessage
    if (e.message.type !== 'text') return

    const text = e.message.text.trim()

    // 「今日の状況」確認
    if (text === '状況' || text === '今日の状況' || text === '確認') {
      await handleStatusCheck(db, e.source.userId, e.replyToken, accessToken, baseUrl)
      return
    }

    const clockType = TEXT_TO_CLOCK[text]
    if (!clockType) {
      await replyMessage(accessToken, e.replyToken, [{
        type: 'text',
        text: '「出勤」「退勤」「休憩」「休憩終了」「状況」と送信してください。'
      }])
      return
    }

    await handleClock(db, e.source.userId, clockType, e.replyToken, accessToken, baseUrl)
    return
  }

  if (event.type === 'postback') {
    const e = event as LinePostbackEvent
    if (e.postback.data === 'action=guide') {
      await replyMessage(accessToken, e.replyToken, [{
        type: 'text',
        text: '【勤怠管理システム 操作ガイド】\nこのアカウントでLINEから勤怠打刻ができます。\n以下のキーワードを送信してください👇\n\n 出勤　→「出勤」または「しゅっきん」\n 退勤　→「退勤」または「たいきん」\n 休憩　→「休憩」または「休憩開始」\n 休憩終了　→「休憩終了」または「戻りました」\n 状況確認　→「状況」または「確認」\n\n打刻後は確認メッセージが届きます。\n不明な点は管理者までご連絡ください。'
      }])
      return
    }
    const clockType = POSTBACK_TO_CLOCK[e.postback.data]
    if (!clockType) return
    await handleClock(db, e.source.userId, clockType, e.replyToken, accessToken, baseUrl)
  }
}

async function handleClock(
  db: FirebaseFirestore.Firestore,
  lineUserId: string,
  clockType: ClockType,
  replyToken: string,
  accessToken: string,
  baseUrl: string
) {
  const userId = await resolveUserId(db, lineUserId)
  if (!userId) {
    const registerUrl = `${baseUrl}/api/register/start`
    await replyMessage(accessToken, replyToken, [{
      type: 'text',
      text: `アカウント未登録です。\n以下のリンクから登録してください👇\n${registerUrl}`
    }])
    return
  }

  const { ok, message, overtimeMinutes } = await applyClockAction(db, userId, clockType)
  await replyMessage(accessToken, replyToken, [{ type: 'text', text: message }])

  // 残業申告通知
  if (ok && overtimeMinutes && overtimeMinutes > 0) {
    const adminId = useRuntimeConfig().lineAdminUserId
    if (adminId) {
      const userSnap = await db.collection('users').doc(userId).get()
      const name = userSnap.data()?.name ?? userId
      const oh = Math.floor(overtimeMinutes / 60)
      const om = overtimeMinutes % 60
      await pushMessage(accessToken, adminId, [{
        type: 'text',
        text: `⚠️ 残業申告\n${name} が退勤しました。\n残業時間: ${oh}時間${om}分`
      }]).catch(() => {/* Push失敗は無視 */})
    }
  }
}

async function handleStatusCheck(
  db: FirebaseFirestore.Firestore,
  lineUserId: string,
  replyToken: string,
  accessToken: string,
  baseUrl: string
) {
  const userId = await resolveUserId(db, lineUserId)
  if (!userId) {
    const registerUrl = `${baseUrl}/api/register/start`
    await replyMessage(accessToken, replyToken, [{
      type: 'text',
      text: `アカウント未登録です。\n以下のリンクから登録してください👇\n${registerUrl}`
    }])
    return
  }

  const { getTodayJST } = await import('../utils/attendance')
  const date = getTodayJST()
  const snap = await db.collection('attendance_records')
    .where('userId', '==', userId)
    .where('date', '==', date)
    .limit(1)
    .get()

  if (snap.empty) {
    await replyMessage(accessToken, replyToken, [{ type: 'text', text: '本日の打刻記録はありません。' }])
    return
  }

  const r = snap.docs[0]!.data()
  const JST = 9 * 60 * 60 * 1000
  const fmt = (ts: { toMillis(): number } | null) => {
    if (!ts) return '--:--'
    const d = new Date(ts.toMillis() + JST)
    return `${String(d.getUTCHours()).padStart(2, '0')}:${String(d.getUTCMinutes()).padStart(2, '0')}`
  }

  const lines = [
    `📋 本日の勤怠（${date}）`,
    `出勤: ${fmt(r.clockIn)}`,
    `退勤: ${r.clockOut ? fmt(r.clockOut) : '勤務中'}`,
    `実働: ${r.totalWorkMinutes ? `${Math.floor(r.totalWorkMinutes / 60)}時間${r.totalWorkMinutes % 60}分` : '集計中'}`
  ]
  await replyMessage(accessToken, replyToken, [{ type: 'text', text: lines.join('\n') }])
}

async function resolveUserId(db: FirebaseFirestore.Firestore, lineUserId: string): Promise<string | null> {
  const snap = await db.collection('users')
    .where('lineUserId', '==', lineUserId)
    .limit(1)
    .get()
  return snap.empty ? null : snap.docs[0]!.id
}
