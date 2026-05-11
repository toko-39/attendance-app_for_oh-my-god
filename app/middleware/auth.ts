export default defineNuxtRouteMiddleware((to) => {
  const { user, loading } = useAuth()

  if (loading.value) return

  if (!user.value && to.path !== '/login') {
    return navigateTo('/login')
  }
})
