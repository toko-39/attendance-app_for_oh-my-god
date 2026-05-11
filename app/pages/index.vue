<script setup lang="ts">
definePageMeta({ middleware: 'auth' })

const { user, logout } = useAuth()
const today = new Date().toISOString().slice(0, 10)
const { records, loading } = useAttendance(today)
</script>

<template>
  <div class="min-h-screen bg-gray-50 dark:bg-gray-900">
    <!-- ヘッダー -->
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

    <!-- ナビ -->
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
          to="/reports"
          class="py-3 border-b-2 border-transparent text-gray-500 hover:text-gray-700"
        >
          月次レポート
        </NuxtLink>
      </div>
    </nav>

    <!-- メインコンテンツ（Phase 4 で実装） -->
    <main class="max-w-7xl mx-auto px-4 py-6">
      <div class="mb-4 flex items-center justify-between">
        <h2 class="text-base font-medium">
          本日の勤怠状況 — {{ today }}
        </h2>
        <UBadge
          variant="soft"
          :label="`${records.length} 件`"
        />
      </div>

      <UCard>
        <div
          v-if="loading"
          class="py-12 text-center text-gray-400"
        >
          読み込み中...
        </div>
        <div
          v-else-if="records.length === 0"
          class="py-12 text-center text-gray-400"
        >
          本日の打刻記録はありません
        </div>
        <div
          v-else
          class="divide-y divide-gray-100"
        >
          <div
            v-for="record in records"
            :key="record.id"
            class="py-3 flex items-center justify-between"
          >
            <span class="text-sm font-medium">{{ record.userId }}</span>
            <span class="text-sm text-gray-500">
              {{ record.clockIn?.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' }) }} 〜
              {{ record.clockOut?.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' }) ?? '勤務中' }}
            </span>
          </div>
        </div>
      </UCard>
    </main>
  </div>
</template>
