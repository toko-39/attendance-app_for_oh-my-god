<script setup lang="ts">
definePageMeta({ layout: false })

const route = useRoute()
const status = computed(() => route.query.status as string | undefined)
const error = computed(() => route.query.error as string | undefined)
const name = computed(() => route.query.name as string | undefined)

const messageMap: Record<string, string> = {
  success: 'アカウント登録が完了しました！\nLINEから「出勤」と送信して打刻できます。',
  already_registered: 'すでに登録済みです。\nLINEから打刻してください。'
}

const errorMap: Record<string, string> = {
  invalid_state: '認証エラーが発生しました。もう一度お試しください。',
  token_exchange_failed: 'LINE認証に失敗しました。もう一度お試しください。',
  profile_fetch_failed: 'プロフィール取得に失敗しました。もう一度お試しください。'
}
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900 p-4">
    <UCard class="w-full max-w-sm text-center">
      <template v-if="error">
        <div class="mb-4 text-red-500">
          <UIcon name="i-lucide-x-circle" class="w-12 h-12 mx-auto mb-2" />
          <p class="text-sm">{{ errorMap[error] ?? '予期しないエラーが発生しました。' }}</p>
        </div>
        <UButton
          to="/api/register/start"
          block
        >
          もう一度登録する
        </UButton>
      </template>

      <template v-else-if="status">
        <div class="mb-4 text-green-500">
          <UIcon name="i-lucide-check-circle" class="w-12 h-12 mx-auto mb-2" />
          <p
            v-if="name"
            class="font-medium mb-1"
          >
            {{ name }} さん
          </p>
          <p class="text-sm whitespace-pre-line text-gray-600 dark:text-gray-400">
            {{ messageMap[status] ?? '処理が完了しました。' }}
          </p>
        </div>
      </template>

      <template v-else>
        <p class="text-sm text-gray-500">
          無効なアクセスです。
        </p>
      </template>
    </UCard>
  </div>
</template>
