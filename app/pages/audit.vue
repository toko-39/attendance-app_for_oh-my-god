<script setup lang="ts">
import type { User } from '@@/types/user'

definePageMeta({ middleware: 'auth' })

const currentMonth = new Date().toISOString().slice(0, 7)
const auth = useFirebaseAuth()
const getToken = async () => await auth.currentUser?.getIdToken() ?? ''

const { data: entries, pending } = await useAsyncData('audit', async () => {
  const token = await getToken()
  return $fetch<{
    recordId: string
    userId: string
    date: string
    editedBy: string
    editedAt: string
    before: { clockIn: string | null, clockOut: string | null }
    after: { clockIn: string | null, clockOut: string | null }
    note: string
  }[]>('/api/audit', { headers: { Authorization: `Bearer ${token}` } })
}, { default: () => [] })

const { data: users } = await useAsyncData<User[]>('users-audit', async () => {
  const token = await getToken()
  return $fetch('/api/users', { headers: { Authorization: `Bearer ${token}` } })
}, { default: () => [] })

const userMap = computed(() =>
  Object.fromEntries((users.value ?? []).map(u => [u.uid, u]))
)

const fmt = (iso: string | null) => {
  if (!iso) return '--:--'
  const d = new Date(iso)
  return d.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' })
}

const fmtDatetime = (iso: string) => {
  const d = new Date(iso)
  return d.toLocaleString('ja-JP', {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit'
  })
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
          :to="`/reports/${currentMonth}`"
          class="py-3 border-b-2 border-transparent text-gray-500 hover:text-gray-700"
        >
          月次レポート
        </NuxtLink>
        <NuxtLink
          to="/audit"
          class="py-3 border-b-2 border-primary-500 font-medium text-primary-600"
        >
          修正履歴
        </NuxtLink>
      </div>
    </nav>

    <main class="max-w-7xl mx-auto px-4 py-6">
      <h2 class="text-base font-medium mb-4">
        打刻修正履歴
      </h2>

      <UCard>
        <div
          v-if="pending"
          class="py-12 text-center text-gray-400"
        >
          読み込み中...
        </div>
        <div
          v-else-if="!entries?.length"
          class="py-12 text-center text-gray-400"
        >
          修正履歴はありません。
        </div>
        <div
          v-else
          class="overflow-x-auto"
        >
          <table class="w-full text-sm">
            <thead>
              <tr class="border-b border-gray-200 dark:border-gray-700 text-left text-gray-500">
                <th class="pb-3 font-medium">
                  修正日時
                </th>
                <th class="pb-3 font-medium">
                  従業員
                </th>
                <th class="pb-3 font-medium">
                  対象日
                </th>
                <th class="pb-3 font-medium">
                  修正前
                </th>
                <th class="pb-3 font-medium">
                  修正後
                </th>
                <th class="pb-3 font-medium">
                  理由
                </th>
              </tr>
            </thead>
            <tbody class="divide-y divide-gray-100 dark:divide-gray-800">
              <tr
                v-for="(entry, i) in entries"
                :key="i"
                class="py-2"
              >
                <td class="py-3 text-gray-500 whitespace-nowrap">
                  {{ fmtDatetime(entry.editedAt) }}
                </td>
                <td class="py-3 font-medium">
                  {{ userMap[entry.userId]?.name ?? entry.userId }}
                </td>
                <td class="py-3 text-gray-500">
                  {{ entry.date }}
                </td>
                <td class="py-3 text-gray-500">
                  出勤 {{ fmt(entry.before.clockIn) }} / 退勤 {{ fmt(entry.before.clockOut) }}
                </td>
                <td class="py-3">
                  出勤 {{ fmt(entry.after.clockIn) }} / 退勤 {{ fmt(entry.after.clockOut) }}
                </td>
                <td class="py-3 text-gray-500">
                  {{ entry.note || '—' }}
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </UCard>
    </main>
  </div>
</template>
