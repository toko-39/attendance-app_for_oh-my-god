<script setup lang="ts">
import type { AttendanceStatus } from '@@/types/attendance'

const props = defineProps<{ status: AttendanceStatus }>()

const config: Record<AttendanceStatus, { label: string, color: 'success' | 'warning' | 'neutral' | 'error' }> = {
  working: { label: '出勤中', color: 'success' },
  on_break: { label: '休憩中', color: 'warning' },
  clocked_out: { label: '退勤済', color: 'neutral' },
  absent: { label: '未出勤', color: 'error' }
}

const badge = computed(() => config[props.status])
</script>

<template>
  <UBadge
    :color="badge.color"
    :label="badge.label"
    variant="subtle"
  />
</template>
