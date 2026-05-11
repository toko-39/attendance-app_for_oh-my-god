<script setup lang="ts">
import type { User } from '@@/types/user'

definePageMeta({ middleware: 'auth' })

const auth = useFirebaseAuth()
const getToken = async () => await auth.currentUser?.getIdToken() ?? ''

const { data: users, refresh } = await useAsyncData<User[]>('users', async () => {
  const token = await getToken()
  return $fetch('/api/users', { headers: { Authorization: `Bearer ${token}` } })
}, { default: () => [] })

// 新規追加
const showAddModal = ref(false)
const newUser = ref({ name: '', email: '', role: 'member' as 'admin' | 'member' })
const adding = ref(false)
const addError = ref('')

const addUser = async () => {
  addError.value = ''
  adding.value = true
  try {
    const token = await getToken()
    await $fetch('/api/users', {
      method: 'POST',
      headers: { Authorization: `Bearer ${token}` },
      body: newUser.value
    })
    showAddModal.value = false
    newUser.value = { name: '', email: '', role: 'member' }
    await refresh()
  }
  catch {
    addError.value = '追加に失敗しました。'
  }
  finally {
    adding.value = false
  }
}

// 削除
const deleting = ref<string | null>(null)
const deleteUser = async (uid: string) => {
  if (!confirm('このユーザーを削除しますか？')) return
  deleting.value = uid
  try {
    const token = await getToken()
    await $fetch(`/api/users/${uid}`, { method: 'DELETE', headers: { Authorization: `Bearer ${token}` } })
    await refresh()
  }
  finally {
    deleting.value = null
  }
}

// ロール変更
const updateRole = async (uid: string, role: 'admin' | 'member') => {
  const token = await getToken()
  await $fetch(`/api/users/${uid}`, {
    method: 'PATCH',
    headers: { Authorization: `Bearer ${token}` },
    body: { role }
  })
  await refresh()
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
          class="py-3 border-b-2 border-primary-500 font-medium text-primary-600"
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

    <main class="max-w-7xl mx-auto px-4 py-6">
      <div class="mb-4 flex items-center justify-between">
        <h2 class="text-base font-medium">
          従業員一覧（{{ users?.length ?? 0 }}名）
        </h2>
        <UButton
          icon="i-lucide-user-plus"
          size="sm"
          @click="showAddModal = true"
        >
          追加
        </UButton>
      </div>

      <UCard>
        <table class="w-full text-sm">
          <thead>
            <tr class="border-b border-gray-200 dark:border-gray-700 text-left text-gray-500">
              <th class="pb-3 font-medium">
                氏名
              </th>
              <th class="pb-3 font-medium">
                メール
              </th>
              <th class="pb-3 font-medium">
                ロール
              </th>
              <th class="pb-3 font-medium">
                LINE連携
              </th>
              <th class="pb-3 font-medium" />
            </tr>
          </thead>
          <tbody class="divide-y divide-gray-100 dark:divide-gray-800">
            <tr
              v-for="u in users"
              :key="u.uid"
              class="py-2"
            >
              <td class="py-3 font-medium">
                {{ u.name }}
              </td>
              <td class="py-3 text-gray-500">
                {{ u.email || '—' }}
              </td>
              <td class="py-3">
                <USelect
                  :model-value="u.role"
                  :items="[{ label: '管理者', value: 'admin' }, { label: 'メンバー', value: 'member' }]"
                  size="sm"
                  @update:model-value="updateRole(u.uid, $event as 'admin' | 'member')"
                />
              </td>
              <td class="py-3">
                <UBadge
                  v-if="u.lineUserId"
                  color="success"
                  variant="subtle"
                  label="連携済"
                />
                <UBadge
                  v-else
                  color="neutral"
                  variant="subtle"
                  label="未連携"
                />
              </td>
              <td class="py-3 text-right">
                <UButton
                  size="xs"
                  color="error"
                  variant="ghost"
                  icon="i-lucide-trash-2"
                  :loading="deleting === u.uid"
                  @click="deleteUser(u.uid)"
                />
              </td>
            </tr>
          </tbody>
        </table>
      </UCard>
    </main>

    <!-- 追加モーダル -->
    <UModal
      :open="showAddModal"
      title="従業員を追加"
      @close="showAddModal = false"
    >
      <template #body>
        <div class="space-y-4">
          <UFormField label="氏名">
            <UInput
              v-model="newUser.name"
              placeholder="山田 太郎"
              class="w-full"
            />
          </UFormField>
          <UFormField label="メールアドレス">
            <UInput
              v-model="newUser.email"
              type="email"
              placeholder="taro@example.com"
              class="w-full"
            />
          </UFormField>
          <UFormField label="ロール">
            <USelect
              v-model="newUser.role"
              :items="[{ label: 'メンバー', value: 'member' }, { label: '管理者', value: 'admin' }]"
              class="w-full"
            />
          </UFormField>
          <UAlert
            v-if="addError"
            color="error"
            :description="addError"
          />
        </div>
      </template>
      <template #footer>
        <div class="flex justify-end gap-2">
          <UButton
            variant="ghost"
            @click="showAddModal = false"
          >
            キャンセル
          </UButton>
          <UButton
            :loading="adding"
            @click="addUser"
          >
            追加
          </UButton>
        </div>
      </template>
    </UModal>
  </div>
</template>
