export default defineNuxtRouteMiddleware(async (to) => {
  if (!to.path.startsWith('/admin')) return

  const session = useState<{ csrfToken: string; user: { id: number; username: string; role: 'ADMIN' } } | null>('admin-session', () => null)
  const isLoginPage = to.path === '/admin/login'

  if (session.value) {
    if (isLoginPage) return navigateTo('/admin')
    return
  }

  try {
    const requestFetch = useRequestFetch()
    const response = await requestFetch('/api/auth/session')
    if (!('data' in response)) throw new Error('Unauthorized')
    session.value = response.data
    if (isLoginPage) return navigateTo('/admin')
  } catch {
    if (!isLoginPage) return navigateTo('/admin/login')
  }
})
