import { Timestamp, FieldValue } from 'firebase-admin/firestore'

interface PatchBody {
  clockIn?: string
  clockOut?: string | null
  note?: string
}

export default defineEventHandler(async (event) => {
  const uid = await verifyIdToken(event)
  await requireAdmin(uid)

  const recordId = getRouterParam(event, 'id')!
  const body = await readBody<PatchBody>(event)

  const db = useAdminFirestore()
  const docRef = db.collection('attendance_records').doc(recordId)
  const doc = await docRef.get()
  if (!doc.exists) throw createError({ statusCode: 404, message: 'Record not found' })

  const updates: Record<string, unknown> = {
    updatedAt: FieldValue.serverTimestamp()
  }
  if (body.clockIn !== undefined) updates.clockIn = Timestamp.fromDate(new Date(body.clockIn))
  if (body.clockOut !== undefined) {
    updates.clockOut = body.clockOut ? Timestamp.fromDate(new Date(body.clockOut)) : null
  }

  // 監査ログを配列に追記
  const prevData = doc.data()!
  updates.editHistory = FieldValue.arrayUnion({
    editedBy: uid,
    editedAt: new Date().toISOString(),
    before: {
      clockIn: prevData.clockIn?.toDate?.()?.toISOString() ?? null,
      clockOut: prevData.clockOut?.toDate?.()?.toISOString() ?? null
    },
    after: {
      clockIn: body.clockIn ?? null,
      clockOut: body.clockOut ?? null
    },
    note: body.note ?? ''
  })

  // clockOut がある場合は実働時間を再計算
  if (updates.clockIn || updates.clockOut !== undefined) {
    const newClockIn = body.clockIn ? new Date(body.clockIn) : prevData.clockIn?.toDate()
    const newClockOut = body.clockOut ? new Date(body.clockOut) : prevData.clockOut?.toDate() ?? null
    if (newClockIn && newClockOut) {
      const breaks = (prevData.breaks ?? []) as { start: FirebaseFirestore.Timestamp, end: FirebaseFirestore.Timestamp | null }[]
      const breakMs = breaks.reduce((acc, b) => {
        if (!b.end) return acc
        return acc + (b.end.toMillis() - b.start.toMillis())
      }, 0)
      updates.totalWorkMinutes = Math.floor((newClockOut.getTime() - newClockIn.getTime() - breakMs) / 60000)
    }
  }

  await docRef.update(updates)
  return { ok: true }
})
