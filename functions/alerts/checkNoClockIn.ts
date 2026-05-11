import * as admin from 'firebase-admin'

const JST = 9 * 60 * 60 * 1000

/** 未出勤アラート：毎日 09:30 JST に実行 */
export const checkNoClockIn = async (): Promise<void> => {
  const db = admin.firestore()
  const accessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN!
  const adminUserId = process.env.LINE_ADMIN_USER_ID!

  const today = new Date(Date.now() + JST).toISOString().slice(0, 10)

  // 当日出勤済みのユーザーIDを取得
  const recordsSnap = await db.collection('attendance_records')
    .where('date', '==', today)
    .get()
  const clockedInUsers = new Set(recordsSnap.docs.map(d => d.data().userId as string))

  // 全メンバーを取得し、未出勤を抽出
  const usersSnap = await db.collection('users')
    .where('role', '==', 'member')
    .get()
  const absentUsers = usersSnap.docs
    .filter(d => !clockedInUsers.has(d.id))
    .map(d => d.data().name as string)

  if (absentUsers.length === 0) return

  const message = `⚠️ 未出勤アラート（${today}）\n\n以下のメンバーがまだ出勤打刻をしていません：\n${absentUsers.map(n => `・${n}`).join('\n')}`
  await pushLine(accessToken, adminUserId, message)
}

async function pushLine(token: string, to: string, text: string): Promise<void> {
  await fetch('https://api.line.me/v2/bot/message/push', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ to, messages: [{ type: 'text', text }] })
  })
}
