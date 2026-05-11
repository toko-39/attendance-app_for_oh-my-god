<script setup lang="ts">
definePageMeta({ layout: false })

const { login, user, loading } = useAuth()
const email = ref('')
const password = ref('')
const error = ref('')
const pending = ref(false)

// ログイン済みならダッシュボードへ
watch([user, loading], ([u, l]) => {
  if (!l && u) navigateTo('/')
}, { immediate: true })

const handleSubmit = async () => {
  error.value = ''
  pending.value = true
  try {
    await login(email.value, password.value)
    await navigateTo('/')
  }
  catch {
    error.value = 'メールアドレスまたはパスワードが正しくありません'
  }
  finally {
    pending.value = false
  }
}
</script>

<template>
  <div class="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
    <UCard class="w-full max-w-sm">
      <template #header>
        <h1 class="text-xl font-semibold text-center">
          勤怠管理システム
        </h1>
        <p class="text-sm text-gray-500 text-center mt-1">
          管理者ログイン
        </p>
      </template>

      <form class="space-y-4" @submit.prevent="handleSubmit">
        <UFormField label="メールアドレス">
          <UInput
            v-model="email"
            type="email"
            placeholder="admin@example.com"
            required
            class="w-full"
          />
        </UFormField>

        <UFormField label="パスワード">
          <UInput
            v-model="password"
            type="password"
            placeholder="••••••••"
            required
            class="w-full"
          />
        </UFormField>

        <UAlert
          v-if="error"
          color="error"
          :description="error"
        />

        <UButton
          type="submit"
          block
          :loading="pending"
        >
          ログイン
        </UButton>
      </form>
    </UCard>
  </div>
</template>
