import { FieldValue, Timestamp } from 'firebase-admin/firestore'
import type { ClockType } from '@@/types/attendance'

const JST_OFFSET_MS = 9 * 60 * 60 * 1000

/** 日本時間で "YYYY-MM-DD" を返す */
export const getTodayJST = (): string => {
  const now = new Date(Date.now() + JST_OFFSET_MS)
  return now.toISOString().slice(0, 10)
}

/** 実働時間（分）を計算する */
export const calcWorkMinutes = (
  clockIn: Timestamp,
  clockOut: Timestamp,
  breaks: { start: Timestamp, end: Timestamp | null }[]
): number => {
  const totalMs = clockOut.toMillis() - clockIn.toMillis()
  const breakMs = breaks.reduce((acc, b) => {
    if (!b.end) return acc
    return acc + (b.end.toMillis() - b.start.toMillis())
  }, 0)
  return Math.floor((totalMs - breakMs) / 60000)
}

/** 打刻処理をFirestoreに反映する */
export const applyClockAction = async (
  db: FirebaseFirestore.Firestore,
  userId: string,
  clockType: ClockType
): Promise<{ ok: boolean, message: string }> => {
  const date = getTodayJST()
  const colRef = db.collection('attendance_records')

  // 当日レコードを取得
  const snap = await colRef
    .where('userId', '==', userId)
    .where('date', '==', date)
    .limit(1)
    .get()

  const now = Timestamp.now()

  if (clockType === 'clock_in') {
    if (!snap.empty) {
      return { ok: false, message: '本日はすでに出勤済みです。' }
    }
    await colRef.add({
      userId,
      date,
      clockIn: now,
      clockOut: null,
      breaks: [],
      totalWorkMinutes: 0,
      updatedAt: FieldValue.serverTimestamp()
    })
    const timeStr = formatTime(now)
    return { ok: true, message: `出勤しました！ ${timeStr}` }
  }

  if (snap.empty) {
    return { ok: false, message: '出勤記録がありません。先に出勤打刻をしてください。' }
  }

  const docRef = snap.docs[0]!.ref
  const record = snap.docs[0]!.data()

  if (clockType === 'clock_out') {
    if (record.clockOut) {
      return { ok: false, message: '本日はすでに退勤済みです。' }
    }
    const workMin = calcWorkMinutes(record.clockIn, now, record.breaks ?? [])
    await docRef.update({
      clockOut: now,
      totalWorkMinutes: workMin,
      updatedAt: FieldValue.serverTimestamp()
    })
    const timeStr = formatTime(now)
    const h = Math.floor(workMin / 60)
    const m = workMin % 60
    return { ok: true, message: `退勤しました！ ${timeStr}\n実働時間: ${h}時間${m}分` }
  }

  if (clockType === 'break_start') {
    const breaks: { start: Timestamp, end: Timestamp | null }[] = record.breaks ?? []
    const activeBreak = breaks.find(b => !b.end)
    if (activeBreak) {
      return { ok: false, message: 'すでに休憩中です。' }
    }
    await docRef.update({
      breaks: [...breaks, { start: now, end: null }],
      updatedAt: FieldValue.serverTimestamp()
    })
    return { ok: true, message: `休憩開始しました。 ${formatTime(now)}` }
  }

  if (clockType === 'break_end') {
    const breaks: { start: Timestamp, end: Timestamp | null }[] = record.breaks ?? []
    const idx = breaks.findLastIndex(b => !b.end)
    if (idx === -1) {
      return { ok: false, message: '休憩中ではありません。' }
    }
    breaks[idx] = { ...breaks[idx]!, end: now }
    await docRef.update({
      breaks,
      updatedAt: FieldValue.serverTimestamp()
    })
    return { ok: true, message: `休憩終了しました。 ${formatTime(now)}` }
  }

  return { ok: false, message: '不明な操作です。' }
}

const formatTime = (ts: Timestamp): string => {
  const d = new Date(ts.toMillis() + JST_OFFSET_MS)
  const hh = String(d.getUTCHours()).padStart(2, '0')
  const mm = String(d.getUTCMinutes()).padStart(2, '0')
  return `${hh}:${mm}`
}
