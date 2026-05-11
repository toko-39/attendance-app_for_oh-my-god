import { getAuth } from 'firebase-admin/auth'

export default defineEventHandler(async (event) => {
  const uid = await verifyIdToken(event)
  await requireAdmin(uid)

  const body = await readBody<{ name: string, email: string, role: 'admin' | 'member' }>(event)
  if (!body.name || !body.email) {
    throw createError({ statusCode: 400, message: 'name と email は必須です' })
  }

  const db = useAdminFirestore()
  const adminAuth = getAuth(useAdminApp())

  const fbUser = await adminAuth.createUser({
    email: body.email,
    displayName: body.name
  })

  await db.collection('users').doc(fbUser.uid).set({
    uid: fbUser.uid,
    lineUserId: '',
    name: body.name,
    email: body.email,
    role: body.role ?? 'member',
    shiftType: 'default',
    createdAt: new Date()
  })

  return { uid: fbUser.uid }
})
