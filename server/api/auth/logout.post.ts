export default defineEventHandler(async (event) => {
  const auth = await requireAdmin(event)
  requireSameOrigin(event)
  requireCsrf(event, auth.csrfToken)
  await destroyAdminSession(event)
  setResponseStatus(event, 204)
  return null
})
