import type { ZodError } from 'zod'

export function zodFields(error: ZodError) {
  const fields: Record<string, string[]> = {}
  for (const issue of error.issues) {
    const key = issue.path.join('.') || '_form'
    ;(fields[key] ||= []).push(issue.message)
  }
  return fields
}
