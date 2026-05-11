<script setup lang="ts">
import type { AttendanceRecord } from '@@/types/attendance'

const props = defineProps<{ record: AttendanceRecord | null }>()
const emit = defineEmits<{ close: [], saved: [] }>()

const toTimeInput = (d: Date | null) =>
  d ? d.toLocaleTimeString('ja-JP', { hour: '2-digit', minute: '2-digit', hour12: false }) : ''

const clockIn = ref('')
const clockOut = ref('')
const note = ref('')
const saving = ref(false)
const error = ref('')

watch(() => props.record, (r) => {
  if (!r) return
  clockIn.value = toTimeInput(r.clockIn)
  clockOut.value = toTimeInput(r.clockOut)
  note.value = ''
  error.value = ''
}, { immediate: true })

const toISOWithDate = (date: string, time: string) => {
  if (!time) return null
  return `${date}T${time}:00+09:00`
}

const save = async () => {
  if (!props.record) return
  error.value = ''
  saving.value = true
  try {
    const auth = useFirebaseAuth()
    const token = await auth.currentUser?.getIdToken()
    await $fetch(`/api/attendance/${props.record.id}`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}` },
      body: {
        clockIn: toISOWithDate(props.record.date, clockIn.value),
        clockOut: clockOut.value ? toISOWithDate(props.record.date, clockOut.value) : null,
        note: note.value
      }
    })
    emit('saved')
    emit('close')
  }
  catch {
    error.value = '保存に失敗しました。もう一度お試しください。'
  }
  finally {
    saving.value = false
  }
}
</script>

<template>
  <UModal
    :open="!!record"
    title="打刻修正"
    @close="emit('close')"
  >
    <template #body>
      <div
        v-if="record"
        class="space-y-4"
      >
        <p class="text-sm text-gray-500">
          対象日: {{ record.date }}
        </p>

        <UFormField label="出勤時刻">
          <UInput
            v-model="clockIn"
            type="time"
            class="w-full"
          />
        </UFormField>

        <UFormField label="退勤時刻">
          <UInput
            v-model="clockOut"
            type="time"
            class="w-full"
          />
        </UFormField>

        <UFormField label="修正理由（任意）">
          <UTextarea
            v-model="note"
            placeholder="例：打刻忘れのため手動修正"
            class="w-full"
          />
        </UFormField>

        <UAlert
          v-if="error"
          color="error"
          :description="error"
        />
      </div>
    </template>

    <template #footer>
      <div class="flex justify-end gap-2">
        <UButton
          variant="ghost"
          @click="emit('close')"
        >
          キャンセル
        </UButton>
        <UButton
          :loading="saving"
          @click="save"
        >
          保存
        </UButton>
      </div>
    </template>
  </UModal>
</template>
