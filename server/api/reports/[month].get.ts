export default defineEventHandler(async (event) => {
  const uid = await verifyIdToken(event)
  await requireAdmin(uid)

  const month = getRouterParam(event, 'month')! // "2026-05"
  if (!/^\d{4}-\d{2}$/.test(month)) {
    throw createError({ statusCode: 400, message: 'month は YYYY-MM 形式で指定してください' })
  }

  const db = useAdminFirestore()
  const [year, mon] = month.split('-').map(Number) as [number, number]
  const startDate = `${month}-01`
  const lastDay = new Date(year, mon, 0).getDate()
  const endDate = `${month}-${String(lastDay).padStart(2, '0')}`

  const [usersSnap, recordsSnap] = await Promise.all([
    db.collection('users').get(),
    db.collection('attendance_records')
      .where('date', '>=', startDate)
      .where('date', '<=', endDate)
      .get()
  ])

  const users = usersSnap.docs.map(d => ({ uid: d.id, name: d.data().name as string }))

  // userId → date → record のマップを構築
  type RecordSummary = {
    date: string
    clockIn: string | null
    clockOut: string | null
    totalWorkMinutes: number
  }
  const recordMap = new Map<string, Map<string, RecordSummary>>()

  for (const d of recordsSnap.docs) {
    const data = d.data()
    const userId = data.userId as string
    const date = data.date as string
    if (!recordMap.has(userId)) recordMap.set(userId, new Map())
    recordMap.get(userId)!.set(date, {
      date,
      clockIn: data.clockIn?.toDate?.()?.toISOString() ?? null,
      clockOut: data.clockOut?.toDate?.()?.toISOString() ?? null,
      totalWorkMinutes: data.totalWorkMinutes ?? 0
    })
  }

  const report = users.map(user => {
    const days = recordMap.get(user.uid) ?? new Map()
    const records = Array.from(days.values())
    const totalWorkMinutes = records.reduce((s, r) => s + r.totalWorkMinutes, 0)
    const workDays = records.filter(r => r.clockIn).length
    const overtimeMinutes = records.reduce((s, r) => {
      const ot = r.totalWorkMinutes - 480 // 8時間超を残業
      return s + (ot > 0 ? ot : 0)
    }, 0)
    return {
      userId: user.uid,
      name: user.name,
      totalWorkMinutes,
      workDays,
      overtimeMinutes,
      records
    }
  })

  return { month, report }
})
