<script setup lang="ts">
import type { AttendanceRecord } from '@@/types/attendance'
import type { User } from '@@/types/user'

definePageMeta({ middleware: 'auth' })

const { user, logout } = useAuth()
const today = new Date().toISOString().slice(0, 10)
const { records, loading } = useAttendance(today)

// 従業員一覧をサーバー API から取得
const auth = useFirebaseAuth()
const getToken = async () => await auth.currentUser?.getIdToken() ?? ''

const { data: users } = await useAsyncData<User[]>('users', async () => {
  const token = await getToken()
  return $fetch('/api/users', { headers: { Authorization: `Bearer ${token}` } })
}, { default: () => [] })

// 打刻修正モーダル
const editTarget = ref<AttendanceRecord | null>(null)
</script>

<template>
  <div class="min-h-screen bg-gray-50 dark:bg-gray-900">
    <header class="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
      <div class="max-w-7xl mx-auto px-4 h-14 flex items-center justify-between">
        <h1 class="text-lg font-semibold">
          勤怠管理
        </h1>
        <div class="flex items-center gap-3">
          <span class="text-sm text-gray-500">{{ user?.email }}</span>
          <UButton
            variant="ghost"
            size="sm"
            @click="logout"
          >
            ログアウト
          </UButton>
        </div>
      </div>
    </header>

    <nav class="bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700">
      <div class="max-w-7xl mx-auto px-4 flex gap-6 text-sm">
        <NuxtLink
          to="/"
          class="py-3 border-b-2 border-primary-500 font-medium text-primary-600"
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
          :to="`/reports/${today.slice(0, 7)}`"
          class="py-3 border-b-2 border-transparent text-gray-500 hover:text-gray-700"
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
      <div class="mb-4 flex items-center justify-between">
        <h2 class="text-base font-medium">
          本日の勤怠状況 — {{ today }}
        </h2>
        <div class="flex gap-2 text-sm text-gray-500">
          <span>出勤中: {{ records.filter(r => !r.clockOut).length }}名</span>
          <span>/ 計: {{ users?.length ?? 0 }}名</span>
        </div>
      </div>

      <AttendanceTable
        :records="records"
        :users="users ?? []"
        :loading="loading"
        @edit="editTarget = $event"
      />

      <LazyClockEditModal
        v-if="editTarget"
        :record="editTarget"
        @close="editTarget = null"
        @saved="editTarget = null"
      />
    </main>
  </div>
</template>
