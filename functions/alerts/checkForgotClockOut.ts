import * as admin from 'firebase-admin'

const JST = 9 * 60 * 60 * 1000

/** 退勤忘れ通知：毎日 23:30 JST に実行 */
export const checkForgotClockOut = async (): Promise<void> => {
  const db = admin.firestore()
  const accessToken = process.env.LINE_CHANNEL_ACCESS_TOKEN!
  const adminUserId = process.env.LINE_ADMIN_USER_ID!

  const today = new Date(Date.now() + JST).toISOString().slice(0, 10)

  // 出勤したが退勤未打刻のレコードを取得
  const snap = await db.collection('attendance_records')
    .where('date', '==', today)
    .where('clockOut', '==', null)
    .get()

  if (snap.empty) return

  // 該当ユーザーの名前を取得
  const userIds = snap.docs.map(d => d.data().userId as string)
  const names: string[] = []
  const lineUserIds: string[] = []

  for (const uid of userIds) {
    const userDoc = await db.collection('users').doc(uid).get()
    if (userDoc.exists) {
      names.push(userDoc.data()!.name as string)
      if (userDoc.data()!.lineUserId) {
        lineUserIds.push(userDoc.data()!.lineUserId as string)
      }
    }
  }

  // 管理者へ通知
  const adminMsg = `⚠️ 退勤忘れ通知（${today}）\n\n以下のメンバーが退勤打刻をしていません：\n${names.map(n => `・${n}`).join('\n')}`
  await pushLine(accessToken, adminUserId, adminMsg)

  // 本人へもリマインダー
  const memberMsg = `🔔 退勤忘れリマインダー\n本日（${today}）の退勤打刻がまだです。\nLINEで「退勤」と送信してください。`
  for (const lineUserId of lineUserIds) {
    await pushLine(accessToken, lineUserId, memberMsg).catch(() => {})
  }
}

async function pushLine(token: string, to: string, text: string): Promise<void> {
  await fetch('https://api.line.me/v2/bot/message/push', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
    body: JSON.stringify({ to, messages: [{ type: 'text', text }] })
  })
}
