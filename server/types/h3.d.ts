import type { getAdminSession } from '../utils/auth'

declare module 'h3' {
  interface H3EventContext {
    auth?: NonNullable<Awaited<ReturnType<typeof getAdminSession>>>
  }
}

export {}
