const LINE_API_BASE = 'https://api.line.me/v2/bot'

const getHeaders = (accessToken: string) => ({
  'Content-Type': 'application/json',
  'Authorization': `Bearer ${accessToken}`
})

export const replyMessage = async (accessToken: string, replyToken: string, messages: unknown[]) => {
  const res = await fetch(`${LINE_API_BASE}/message/reply`, {
    method: 'POST',
    headers: getHeaders(accessToken),
    body: JSON.stringify({ replyToken, messages })
  })
  if (!res.ok) {
    throw new Error(`LINE reply failed: ${res.status}`)
  }
}

export const pushMessage = async (accessToken: string, to: string, messages: unknown[]) => {
  const res = await fetch(`${LINE_API_BASE}/message/push`, {
    method: 'POST',
    headers: getHeaders(accessToken),
    body: JSON.stringify({ to, messages })
  })
  if (!res.ok) {
    throw new Error(`LINE push failed: ${res.status}`)
  }
}
