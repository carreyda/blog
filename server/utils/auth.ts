import { createHash, createHmac, randomBytes, timingSafeEqual } from 'node:crypto'
import type { H3Event } from 'h3'

const COOKIE_NAME = 'blog_session'
const SESSION_MAX_AGE_SECONDS = 7 * 24 * 60 * 60

function sha256(value: string) {
  return createHash('sha256').update(value).digest('hex')
}

function sessionSecret(event: H3Event) {
  const secret = useRuntimeConfig(event).sessionSecret
  if (typeof secret !== 'string' || Buffer.byteLength(secret) < 32) {
    throw createError({ statusCode: 503, statusMessage: 'Session secret is not configured' })
  }
  return secret
}

function csrfTokenFor(event: H3Event, sessionToken: string) {
  return createHmac('sha256', sessionSecret(event)).update(`csrf:${sessionToken}`).digest('base64url')
}

function secureCookie(event: H3Event) {
  return new URL(useRuntimeConfig(event).public.siteUrl).protocol === 'https:'
}

export async function createAdminSession(event: H3Event, userId: number) {
  const token = randomBytes(32).toString('base64url')
  const csrfToken = csrfTokenFor(event, token)
  const expiresAt = new Date(Date.now() + SESSION_MAX_AGE_SECONDS * 1000)

  await usePrisma().session.create({
    data: {
      id: sha256(token),
      userId,
      csrfTokenHash: sha256(csrfToken),
      expiresAt,
    },
  })

  setCookie(event, COOKIE_NAME, token, {
    httpOnly: true,
    secure: secureCookie(event),
    sameSite: 'lax',
    path: '/',
    maxAge: SESSION_MAX_AGE_SECONDS,
  })

  return csrfToken
}

export async function getAdminSession(event: H3Event) {
  const token = getCookie(event, COOKIE_NAME)
  if (!token) return null

  const session = await usePrisma().session.findUnique({
    where: { id: sha256(token) },
    include: { user: true },
  })

  if (!session || session.expiresAt <= new Date() || session.user.role !== 'ADMIN') {
    if (session) await usePrisma().session.delete({ where: { id: session.id } }).catch(() => undefined)
    deleteCookie(event, COOKIE_NAME, { path: '/' })
    return null
  }

  const csrfToken = csrfTokenFor(event, token)
  if (session.csrfTokenHash !== sha256(csrfToken)) return null

  return { session, user: session.user, csrfToken }
}

export async function requireAdmin(event: H3Event) {
  const auth = await getAdminSession(event)
  if (!auth) throw createError({ statusCode: 401, statusMessage: 'Unauthorized' })
  event.context.auth = auth
  return auth
}

export function requireSameOrigin(event: H3Event) {
  const origin = getHeader(event, 'origin')
  const expected = new URL(useRuntimeConfig(event).public.siteUrl).origin
  if (!origin || origin !== expected) {
    throw createError({ statusCode: 403, statusMessage: 'Invalid request origin' })
  }
}

export function requireCsrf(event: H3Event, expectedToken: string) {
  const provided = getHeader(event, 'x-csrf-token') || ''
  const providedBuffer = Buffer.from(provided)
  const expectedBuffer = Buffer.from(expectedToken)
  if (providedBuffer.length !== expectedBuffer.length || !timingSafeEqual(providedBuffer, expectedBuffer)) {
    throw createError({ statusCode: 403, statusMessage: 'Invalid CSRF token' })
  }
}

export async function destroyAdminSession(event: H3Event) {
  const token = getCookie(event, COOKIE_NAME)
  if (token) await usePrisma().session.delete({ where: { id: sha256(token) } }).catch(() => undefined)
  deleteCookie(event, COOKIE_NAME, { path: '/' })
}
