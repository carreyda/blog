export default defineEventHandler(async (event) => {
  const auth = await getAdminSession(event)
  if (!auth) return apiError(event, 401, 'UNAUTHORIZED', '登录状态已失效')

  return {
    data: {
      user: { id: auth.user.id, username: auth.user.username, role: auth.user.role },
      csrfToken: auth.csrfToken,
    },
  }
})
