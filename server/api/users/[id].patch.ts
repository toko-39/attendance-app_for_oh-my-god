export default defineEventHandler(async (event) => {
  const uid = await verifyIdToken(event)
  await requireAdmin(uid)

  const targetId = getRouterParam(event, 'id')!
  const body = await readBody<{ role?: 'admin' | 'member', name?: string }>(event)

  const db = useAdminFirestore()
  const updates: Record<string, unknown> = {}
  if (body.role) updates.role = body.role
  if (body.name) updates.name = body.name

  await db.collection('users').doc(targetId).update(updates)
  return { ok: true }
})
