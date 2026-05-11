<script setup lang="ts">
import type { AttendanceRecord, AttendanceStatus } from '@@/types/attendance'
import type { User } from '@@/types/user'

const props = defineProps<{
  records: AttendanceRecord[]
  users: User[]
  loading: boolean
}>()

const emit = defineEmits<{
  edit: [record: AttendanceRecord]
}>()

const userMap = computed(() =>
  Object.fromEntries(props.users.map(u => [u.uid, u]))
)

const rows = computed(() =>
  props.users.map(user => {
    const record = props.records.find(r => r.userId === user.uid)
    const status = getAttendanceStatus(record)
    return { user, record, status }
  })
)

const fmt = (d: Date | null) =>
  d ? d.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit' }) : '--:--'
</script>

<template>
  <UCard>
    <div
      v-if="loading"
      class="py-12 text-center text-gray-400"
    >
      読み込み中...
    </div>

    <div
      v-else
      class="overflow-x-auto"
    >
      <table class="w-full text-sm">
        <thead>
          <tr class="border-b border-gray-200 dark:border-gray-700 text-left text-gray-500">
            <th class="pb-3 font-medium">
              氏名
            </th>
            <th class="pb-3 font-medium">
              ステータス
            </th>
            <th class="pb-3 font-medium">
              出勤
            </th>
            <th class="pb-3 font-medium">
              退勤
            </th>
            <th class="pb-3 font-medium">
              実働
            </th>
            <th class="pb-3 font-medium" />
          </tr>
        </thead>
        <tbody class="divide-y divide-gray-100 dark:divide-gray-800">
          <tr
            v-for="{ user, record, status } in rows"
            :key="user.uid"
            class="py-2"
          >
            <td class="py-3 font-medium">
              {{ user.name }}
            </td>
            <td class="py-3">
              <StatusBadge :status="status" />
            </td>
            <td class="py-3 text-gray-600 dark:text-gray-400">
              {{ record ? fmt(record.clockIn) : '--:--' }}
            </td>
            <td class="py-3 text-gray-600 dark:text-gray-400">
              {{ record ? fmt(record.clockOut) : '--:--' }}
            </td>
            <td class="py-3 text-gray-600 dark:text-gray-400">
              <template v-if="record && record.clockIn">
                {{ Math.floor(calcTotalWorkMinutes(record) / 60) }}h{{ calcTotalWorkMinutes(record) % 60 }}m
              </template>
              <template v-else>
                --
              </template>
            </td>
            <td class="py-3 text-right">
              <UButton
                v-if="record"
                size="xs"
                variant="ghost"
                icon="i-lucide-pencil"
                @click="emit('edit', record)"
              />
            </td>
          </tr>
        </tbody>
      </table>
    </div>
  </UCard>
</template>
