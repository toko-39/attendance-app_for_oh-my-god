export default defineEventHandler(async (event) => {
  const uid = await verifyIdToken(event)
  await requireAdmin(uid)

  const db = useAdminFirestore()

  // editHistory を持つレコードを取得
  const snap = await db.collection('attendance_records').get()

  interface AuditEntry {
    recordId: string
    userId: string
    date: string
    editedBy: string
    editedAt: string
    before: { clockIn: string | null, clockOut: string | null }
    after: { clockIn: string | null, clockOut: string | null }
    note: string
  }

  const entries: AuditEntry[] = []
  for (const doc of snap.docs) {
    const data = doc.data()
    const history = (data.editHistory ?? []) as AuditEntry[]
    for (const h of history) {
      entries.push({
        recordId: doc.id,
        userId: data.userId,
        date: data.date,
        editedBy: h.editedBy,
        editedAt: h.editedAt,
        before: h.before,
        after: h.after,
        note: h.note ?? ''
      })
    }
  }

  // 新しい順に並べ替え
  entries.sort((a, b) => b.editedAt.localeCompare(a.editedAt))

  return entries
})
