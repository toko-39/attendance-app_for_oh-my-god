// https://nuxt.com/docs/api/configuration/nuxt-config
export default defineNuxtConfig({
  modules: [
    '@nuxt/eslint',
    '@nuxt/ui'
  ],

  devtools: {
    enabled: true
  },

  css: ['~/assets/css/main.css'],

  routeRules: {
    '/': { ssr: true },
    '/login': { prerender: true },
    '/employees/**': { ssr: true },
    '/reports/**': { ssr: true }
  },

  runtimeConfig: {
    // サーバーサイドのみ
    lineChannelSecret: process.env.LINE_CHANNEL_SECRET,
    lineChannelAccessToken: process.env.LINE_CHANNEL_ACCESS_TOKEN,
    lineAdminUserId: process.env.LINE_ADMIN_USER_ID,
    lineLoginChannelSecret: process.env.LINE_LOGIN_CHANNEL_SECRET,
    // クライアント・サーバー両方
    public: {
      firebaseApiKey: process.env.NUXT_PUBLIC_FIREBASE_API_KEY,
      firebaseAuthDomain: process.env.NUXT_PUBLIC_FIREBASE_AUTH_DOMAIN,
      firebaseProjectId: process.env.NUXT_PUBLIC_FIREBASE_PROJECT_ID,
      firebaseStorageBucket: process.env.NUXT_PUBLIC_FIREBASE_STORAGE_BUCKET,
      firebaseMessagingSenderId: process.env.NUXT_PUBLIC_FIREBASE_MESSAGING_SENDER_ID,
      firebaseAppId: process.env.NUXT_PUBLIC_FIREBASE_APP_ID,
      lineLoginChannelId: process.env.NUXT_PUBLIC_LINE_LOGIN_CHANNEL_ID,
      baseUrl: process.env.NUXT_PUBLIC_BASE_URL ?? 'http://localhost:3000'
    }
  },

  compatibilityDate: '2025-01-15',

  eslint: {
    config: {
      stylistic: {
        commaDangle: 'never',
        braceStyle: '1tbs'
      }
    }
  }
})
