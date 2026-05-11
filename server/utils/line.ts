const LINE_API_BASE = 'https://api.line.me/v2/bot'

const getHeaders = () => ({
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${process.env.LINE_CHANNEL_ACCESS_TOKEN}`
})

export const replyMessage = async (replyToken: string, messages: unknown[]) => {
  const res = await fetch(`${LINE_API_BASE}/message/reply`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ replyToken, messages })
  })
  if (!res.ok) {
    throw new Error(`LINE reply failed: ${res.status}`)
  }
}

export const pushMessage = async (to: string, messages: unknown[]) => {
  const res = await fetch(`${LINE_API_BASE}/message/push`, {
    method: 'POST',
    headers: getHeaders(),
    body: JSON.stringify({ to, messages })
  })
  if (!res.ok) {
    throw new Error(`LINE push failed: ${res.status}`)
  }
}
