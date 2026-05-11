import { getAuth } from 'firebase-admin/auth'

export default defineEventHandler(async (event) => {
  const uid = await verifyIdToken(event)
  await requireAdmin(uid)

  const targetId = getRouterParam(event, 'id')!
  const db = useAdminFirestore()
  const adminAuth = getAuth(useAdminApp())

  await Promise.all([
    db.collection('users').doc(targetId).delete(),
    adminAuth.deleteUser(targetId).catch(() => {/* Firebase Auth に存在しない場合は無視 */})
  ])

  return { ok: true }
})
