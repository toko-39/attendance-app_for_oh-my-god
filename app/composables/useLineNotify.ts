// Phase 5 で実装予定。
// Cloud Functions 側での LINE Push API 送信が主な通知経路のため、
// このファイルは管理者向けの手動通知 API を呼ぶユーティリティとして使用する。

export const useLineNotify = () => {
  const sendManualAlert = async (userId: string, message: string) => {
    await $fetch('/api/notify', {
      method: 'POST',
      body: { userId, message }
    })
  }

  return { sendManualAlert }
}
