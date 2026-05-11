export default defineEventHandler(async (event) => {
  const uid = await verifyIdToken(event)
  await requireAdmin(uid)

  const db = useAdminFirestore()
  const snap = await db.collection('users').orderBy('createdAt', 'asc').get()

  return snap.docs.map(d => {
    const data = d.data()
    return {
      uid: d.id,
      name: data.name,
      email: data.email,
      role: data.role,
      lineUserId: data.lineUserId,
      shiftType: data.shiftType,
      createdAt: data.createdAt?.toDate?.()?.toISOString() ?? null
    }
  })
})
