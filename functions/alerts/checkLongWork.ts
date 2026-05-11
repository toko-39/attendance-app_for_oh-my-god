import * as admin from 'firebase-admin'
import { Timestamp } from 'firebase-admin/firestore'

const JST = 9 * 60 * 60 * 1000
const LONG_WORK_THRESHOLD_MIN = 480 // 8時間

/** 長時間労働警告：1時間ごとに実行 */
export const checkLongWork = async (): Promise<void> => {
  const db = admin.firestore()
  const accessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN!
  const adminUserId = process.env.LINE_ADMIN_USER_ID!

  const today = new Date(Date.now() + JST).toISOString().slice(0, 10)

  // 出勤中（clockOut なし）のレコードを取得
  const snap = await db.collection('attendance_records')
    .where('date', '==', today)
    .where('clockOut', '==', null)
    .get()

  if (snap.empty) return

  const now = Timestamp.now()
  const alerts: string[] = []

  for (const doc of snap.docs) {
    const data = doc.data()
    const clockIn = data.clockIn as Timestamp
    const breaks = (data.breaks ?? []) as { start: Timestamp, end: Timestamp | null }[]

    const totalMs = now.toMillis() - clockIn.toMillis()
    const breakMs = breaks.reduce((acc, b) => {
      if (!b.end) return acc
      return acc + (b.end.toMillis() - b.start.toMillis())
    }, 0)
    const workMin = Math.floor((totalMs - breakMs) / 60000)

    if (workMin >= LONG_WORK_THRESHOLD_MIN) {
      // すでにアラート送信済みかチェック（alert_logs）
      const alreadyAlerted = await db.collection('alert_logs')
        .where('type', '==', 'long_work')
        .where('targetUserId', '==', data.userId)
        .where('date', '==', today)
        .limit(1)
        .get()
      if (!alreadyAlerted.empty) continue

      const userDoc = await db.collection('users').doc(data.userId as string).get()
      const name = userDoc.data()?.name ?? data.userId
      const h = Math.floor(workMin / 60)
      const m = workMin % 60
      alerts.push(`・${name}（${h}時間${m}分）`)

      // alert_log 記録
      await db.collection('alert_logs').add({
        type: 'long_work',
        targetUserId: data.userId,
        date: today,
        triggeredAt: now,
        sentTo: [adminUserId],
        message: `長時間労働: ${h}h${m}m`,
        resolved: false
      })
    }
  }

  if (alerts.length === 0) return

  const message = `⚠️ 長時間労働警告（${today}）\n\n8時間以上勤務中のメンバー：\n${alerts.join('\n')}`
  await fetch('https://api.line.me/v2/bot/message/push', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${accessToken}` },
    body: JSON.stringify({ to: adminUserId, messages: [{ type: 'text', text: message }] })
  })
}
