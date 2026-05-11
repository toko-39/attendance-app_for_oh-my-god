<script setup lang="ts">
useHead({
  meta: [
    { name: 'viewport', content: 'width=device-width, initial-scale=1' }
  ],
  htmlAttrs: { lang: 'ja' }
})

useSeoMeta({
  title: '勤怠管理システム',
  description: 'oh-my-god 勤怠管理システム'
})
</script>

<template>
  <UApp>
    <NuxtPage />
  </UApp>
</template>
