export default defineEventHandler(async (event) => {
  const path = getRequestURL(event).pathname
  if (!path.startsWith('/api/admin/')) return

  const auth = await requireAdmin(event)
  if (['POST', 'PUT', 'PATCH', 'DELETE'].includes(event.method)) {
    requireSameOrigin(event)
    requireCsrf(event, auth.csrfToken)
  }
})
