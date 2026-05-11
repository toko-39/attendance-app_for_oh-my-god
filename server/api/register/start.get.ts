import crypto from 'crypto'

// 従業員登録フロー Step 1：LINE Login の認証URLへリダイレクト
export default defineEventHandler(async (event) => {
  const config = useRuntimeConfig()
  const state = crypto.randomBytes(16).toString('hex')
  const nonce = crypto.randomBytes(16).toString('hex')

  // CSRF対策 state を Cookie に保存
  setCookie(event, 'line_login_state', state, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    maxAge: 600,
    path: '/'
  })

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: config.public.lineLoginChannelId,
    redirect_uri: `${getRequestURL(event).origin}/api/register/callback`,
    state,
    scope: 'profile openid',
    nonce
  })

  return sendRedirect(event, `https://access.line.me/oauth2/v2.1/authorize?${params}`)
})
