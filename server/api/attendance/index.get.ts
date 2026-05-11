export default defineEventHandler(async (event) => {
  const uid = await verifyIdToken(event)
  await requireAdmin(uid)

  const query = getQuery(event)
  const date = (query.date as string) ?? new Date().toISOString().slice(0, 10)

  const db = useAdminFirestore()
  const snap = await db.collection('attendance_records')
    .where('date', '==', date)
    .get()

  return snap.docs.map(d => {
    const data = d.data()
    const fmt = (ts: FirebaseFirestore.Timestamp | null) => ts?.toDate().toISOString() ?? null
    return {
      id: d.id,
      userId: data.userId,
      date: data.date,
      clockIn: fmt(data.clockIn),
      clockOut: fmt(data.clockOut),
      breaks: (data.breaks ?? []).map((b: { start: FirebaseFirestore.Timestamp, end: FirebaseFirestore.Timestamp | null }) => ({
        start: fmt(b.start),
        end: fmt(b.end)
      })),
      totalWorkMinutes: data.totalWorkMinutes ?? 0,
      updatedAt: fmt(data.updatedAt)
    }
  })
})
