import { getAuth } from 'firebase-admin/auth'

/** Authorization ヘッダーから Firebase UID を検証して返す */
export const verifyIdToken = async (event: Parameters<typeof getHeader>[0]): Promise<string> => {
  const authHeader = getHeader(event, 'authorization') ?? ''
  const token = authHeader.replace('Bearer ', '')
  if (!token) throw createError({ statusCode: 401, message: 'Unauthorized' })

  try {
    const decoded = await getAuth(useAdminApp()).verifyIdToken(token)
    return decoded.uid
  }
  catch {
    throw createError({ statusCode: 401, message: 'Invalid token' })
  }
}

/** UID が admin ロールかを確認する */
export const requireAdmin = async (uid: string): Promise<void> => {
  const db = useAdminFirestore()
  const doc = await db.collection('users').doc(uid).get()
  if (!doc.exists || doc.data()?.role !== 'admin') {
    throw createError({ statusCode: 403, message: 'Forbidden' })
  }
}
