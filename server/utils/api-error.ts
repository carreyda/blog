import type { H3Event } from 'h3'

export function apiError(
  event: H3Event,
  statusCode: number,
  code: string,
  message: string,
  fields?: Record<string, string[]>,
) {
  setResponseStatus(event, statusCode)
  return {
    error: {
      code,
      message,
      ...(fields ? { fields } : {}),
    },
  }
}
