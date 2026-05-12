<script setup lang="ts">
definePageMeta({ middleware: 'auth' })

const route = useRoute()
const router = useRouter()
const month = computed(() => route.params.month as string)

const auth = useFirebaseAuth()
const getToken = async () => await auth.currentUser?.getIdToken() ?? ''

type DayRecord = { date: string, clockIn: string | null, clockOut: string | null, totalWorkMinutes: number }
type UserReport = {
  userId: string
  name: string
  totalWorkMinutes: number
  workDays: number
  overtimeMinutes: number
  records: DayRecord[]
}

const { data, pending, refresh } = await useAsyncData(`report-${month.value}`, async () => {
  const token = await getToken()
  return $fetch<{ month: string, report: UserReport[] }>(`/api/reports/${month.value}`, {
    headers: { Authorization: `Bearer ${token}` }
  })
})

// 月移動
const prevMonth = computed(() => {
  const [y, m] = month.value.split('-').map(Number) as [number, number]
  const d = new Date(y, m - 2, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
})
const nextMonth = computed(() => {
  const [y, m] = month.value.split('-').map(Number) as [number, number]
  const d = new Date(y, m, 1)
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
})

// CSV エクスポート
const exportCsv = () => {
  if (!data.value) return
  const rows = [['氏名', '出勤日数', '実働時間(分)', '残業時間(分)']]
  for (const u of data.value.report) {
    rows.push([u.name, String(u.workDays), String(u.totalWorkMinutes), String(u.overtimeMinutes)])
  }
  const csv = rows.map(r => r.join(',')).join('\n')
  const blob = new Blob(['\uFEFF' + csv], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = `勤怠レポート_${month.value}.csv`
  a.click()
  URL.revokeObjectURL(url)
}

const fmtMin = (min: number) => `${Math.floor(min / 60)}h${min % 60}m`
const fmtTime = (iso: string | null) => {
  if (!iso) return '--:--'
  const d = new Date(iso)
  return d.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })
}
</script>

<template>
  <div class="min-h-screen bg-gray-50 dark:bg-gray-900">
    <header class="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
      <div class="max-w-7xl mx-auto px-4 h-14 flex items-center">
        <h1 class="text-lg font-semibold">
          勤怠管理
        </h1>
      </div>
    </header>

    <nav class="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
      <div class="max-w-7xl mx-auto px-4 flex gap-6 text-sm">
        <NuxtLink
          to="/"
          class="py-3 border-b-2 border-transparent text-gray-500 hover:text-gray-700"
        >
          ダッシュボード
        </NuxtLink>
        <NuxtLink
          to="/employees"
          class="py-3 border-b-2 border-transparent text-gray-500 hover:text-gray-700"
        >
          従業員管理
        </NuxtLink>
        <NuxtLink
          :to="`/reports/${month}`"
          class="py-3 border-b-2 border-primary-500 font-medium text-primary-600"
        >
          月次レポート
        </NuxtLink>
        <NuxtLink
          to="/audit"
          class="py-3 border-b-2 border-transparent text-gray-500 hover:text-gray-700"
        >
          修正履歴
        </NuxtLink>
      </div>
    </nav>

    <main class="max-w-7xl mx-auto px-4 py-6">
      <!-- 月ナビ -->
      <div class="mb-6 flex items-center justify-between">
        <div class="flex items-center gap-3">
          <UButton
            icon="i-lucide-chevron-left"
            variant="ghost"
            size="sm"
            @click="router.push(`/reports/${prevMonth}`)"
          />
          <h2 class="text-base font-medium">
            {{ month }} 月次レポート
          </h2>
          <UButton
            icon="i-lucide-chevron-right"
            variant="ghost"
            size="sm"
            @click="router.push(`/reports/${nextMonth}`)"
          />
        </div>
        <UButton
          icon="i-lucide-download"
          size="sm"
          variant="outline"
          @click="exportCsv"
        >
          CSV
        </UButton>
      </div>

      <!-- サマリーテーブル -->
      <UCard class="mb-6">
        <div
          v-if="pending"
          class="py-8 text-center text-gray-400"
        >
          読み込み中...
        </div>
        <table
          v-else
          class="w-full text-sm"
        >
          <thead>
            <tr class="border-b border-gray-200 dark:border-gray-700 text-left text-gray-500">
              <th class="pb-3 font-medium">
                氏名
              </th>
              <th class="pb-3 font-medium text-right">
                出勤日数
              </th>
              <th class="pb-3 font-medium text-right">
                実働時間
              </th>
              <th class="pb-3 font-medium text-right">
                残業時間
              </th>
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100 dark:divide-gray-800">
            <tr
              v-for="u in data?.report"
              :key="u.userId"
            >
              <td class="py-3 font-medium">
                {{ u.name }}
              </td>
              <td class="py-3 text-right text-gray-600">
                {{ u.workDays }}日
              </td>
              <td class="py-3 text-right text-gray-600">
                {{ fmtMin(u.totalWorkMinutes) }}
              </td>
              <td class="py-3 text-right">
                <span :class="u.overtimeMinutes > 0 ? 'text-red-500 font-medium' : 'text-gray-600'">
                  {{ fmtMin(u.overtimeMinutes) }}
                </span>
              </td>
            </tr>
          </tbody>
        </table>
      </UCard>

      <!-- 従業員ごとの日別明細 -->
      <div
        v-if="!pending"
        class="space-y-4"
      >
        <UCard
          v-for="u in data?.report"
          :key="u.userId"
        >
          <template #header>
            <h3 class="text-sm font-medium">
              {{ u.name }}
            </h3>
          </template>
          <table class="w-full text-xs">
            <thead>
              <tr class="text-left text-gray-400 border-b border-gray-100">
                <th class="pb-2">
                  日付
                </th>
                <th class="pb-2">
                  出勤
                </th>
                <th class="pb-2">
                  退勤
                </th>
                <th class="pb-2 text-right">
                  実働
                </th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-50">
              <tr
                v-for="r in u.records"
                :key="r.date"
              >
                <td class="py-1.5 text-gray-600">
                  {{ r.date }}
                </td>
                <td class="py-1.5">
                  {{ fmtTime(r.clockIn) }}
                </td>
                <td class="py-1.5">
                  {{ fmtTime(r.clockOut) }}
                </td>
                <td class="py-1.5 text-right text-gray-600">
                  {{ r.totalWorkMinutes ? fmtMin(r.totalWorkMinutes) : '--' }}
                </td>
              </tr>
            </tbody>
          </table>
        </UCard>
      </div>
    </main>
  </div>
</template>
