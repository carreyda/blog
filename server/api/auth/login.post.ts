import argon2 from 'argon2'
import { loginSchema } from '../../../shared/schemas/auth'

export default defineEventHandler(async (event) => {
  requireSameOrigin(event)

  const parsed = loginSchema.safeParse(await readBody(event))
  if (!parsed.success) return apiError(event, 400, 'VALIDATION_ERROR', '请输入有效的用户名和密码')

  const ip = getRequestIP(event, { xForwardedFor: true }) || 'unknown'
  const username = parsed.data.username.toLowerCase()
  const limitKeys = [`ip:${ip}`, `username:${username}`]

  if (isLoginRateLimited(limitKeys)) {
    return apiError(event, 429, 'RATE_LIMITED', '登录尝试过多，请稍后再试')
  }

  const user = await usePrisma().user.findUnique({ where: { username } })
  const valid = user ? await argon2.verify(user.passwordHash, parsed.data.password) : false
  if (!user || !valid) {
    recordLoginFailure(limitKeys)
    return apiError(event, 401, 'INVALID_CREDENTIALS', '用户名或密码错误')
  }

  clearLoginFailures(limitKeys)
  await usePrisma().session.deleteMany({ where: { userId: user.id, expiresAt: { lte: new Date() } } })
  const csrfToken = await createAdminSession(event, user.id)

  return { data: { user: { id: user.id, username: user.username, role: user.role }, csrfToken } }
})
