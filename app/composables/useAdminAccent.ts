/**
 * Admin accent colour.
 *
 * The actual colour ramps live in `app/assets/css/admin-theme.css`, keyed by
 * `html[data-accent]`. This composable only decides which one is active and
 * persists the choice in a cookie so SSR renders the right accent on the very
 * first frame (no flash of the default colour).
 */

export type AdminAccentId = 'sky' | 'indigo' | 'violet' | 'emerald' | 'amber' | 'rose'

export interface AdminAccent {
  id: AdminAccentId
  label: string
  /** Mid tone used for the picker chip (the -400 step, readable on both themes). */
  swatch: string
}

export const ADMIN_ACCENTS: AdminAccent[] = [
  { id: 'sky', label: '浅蓝', swatch: '#67a1eb' },
  { id: 'indigo', label: '靛蓝', swatch: '#8399ec' },
  { id: 'violet', label: '紫罗兰', swatch: '#a68edf' },
  { id: 'emerald', label: '苔绿', swatch: '#51b588' },
  { id: 'amber', label: '琥珀', swatch: '#c3955e' },
  { id: 'rose', label: '玫瑰', swatch: '#db8088' },
]

export const DEFAULT_ADMIN_ACCENT: AdminAccentId = 'sky'

const isAccentId = (value: unknown): value is AdminAccentId =>
  ADMIN_ACCENTS.some(accent => accent.id === value)

export function useAdminAccent() {
  const cookie = useCookie<string>('admin-accent', {
    default: () => DEFAULT_ADMIN_ACCENT,
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 365,
  })

  const accent = computed<AdminAccentId>(() =>
    isAccentId(cookie.value) ? cookie.value : DEFAULT_ADMIN_ACCENT,
  )

  const current = computed<AdminAccent>(
    () => ADMIN_ACCENTS.find(item => item.id === accent.value) ?? ADMIN_ACCENTS[0]!,
  )

  function setAccent(id: AdminAccentId) {
    cookie.value = id
  }

  // Drive the CSS ramp from <html>. Admin layouts are the only place this
  // composable is called, so the attribute disappears on public pages.
  useHead({
    htmlAttrs: {
      'data-accent': accent,
    },
  })

  return { accent, current, accents: ADMIN_ACCENTS, setAccent }
}
