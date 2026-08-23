const WINDOW_MS = 15 * 60 * 1000
const MAX_FAILURES = 10

interface FailureBucket {
  count: number
  resetAt: number
}

const failures = new Map<string, FailureBucket>()

function currentBucket(key: string) {
  const now = Date.now()
  const existing = failures.get(key)
  if (!existing || existing.resetAt <= now) {
    const bucket = { count: 0, resetAt: now + WINDOW_MS }
    failures.set(key, bucket)
    return bucket
  }
  return existing
}

export function isLoginRateLimited(keys: string[]) {
  return keys.some(key => currentBucket(key).count >= MAX_FAILURES)
}

export function recordLoginFailure(keys: string[]) {
  for (const key of keys) currentBucket(key).count += 1
}

export function clearLoginFailures(keys: string[]) {
  for (const key of keys) failures.delete(key)
}
