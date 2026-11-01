/**
 * Admin image library backed by Tencent Cloud COS.
 *
 * `items` holds every asset returned by `/api/admin/media` (the page keeps
 * client-side search / sort / pagination because a personal blog library stays
 * small). Mutations hit the upload and delete endpoints and then refresh the
 * shared state so the list always mirrors the database and the bucket.
 */

export type AdminMediaFormat = 'PNG' | 'JPG' | 'WEBP' | 'GIF' | 'AVIF'

export interface AdminMediaItem {
  id: number
  name: string
  url: string
  width: number
  height: number
  bytes: number
  format: AdminMediaFormat
  createdAt: string
}

export const ADMIN_MEDIA_ACCEPT = 'image/png,image/jpeg,image/webp,image/gif,image/avif'
export const ADMIN_MEDIA_MAX_BYTES = 10 * 1024 * 1024
export const ADMIN_MEDIA_PAGE_SIZE = 12

const MIME_FORMAT: Record<string, AdminMediaFormat> = {
  'image/png': 'PNG',
  'image/jpeg': 'JPG',
  'image/webp': 'WEBP',
  'image/gif': 'GIF',
  'image/avif': 'AVIF',
}

export function isSupportedMediaFile(file: File): boolean {
  return Boolean(MIME_FORMAT[file.type]) && file.size > 0 && file.size <= ADMIN_MEDIA_MAX_BYTES
}

/* -------------------------------------------------------------- utilities */

export function formatMediaBytes(bytes: number): string {
  if (!Number.isFinite(bytes) || bytes <= 0) return '0 B'
  const units = ['B', 'KB', 'MB', 'GB'] as const
  let value = bytes
  let unit = 0
  while (value >= 1024 && unit < units.length - 1) {
    value /= 1024
    unit += 1
  }
  const digits = unit === 0 ? 0 : value >= 100 ? 0 : value >= 10 ? 1 : 2
  return `${Number(value.toFixed(digits))} ${units[unit]}`
}

const mediaDateFormatter = new Intl.DateTimeFormat('zh-CN', {
  timeZone: 'Asia/Shanghai',
  year: 'numeric',
  month: '2-digit',
  day: '2-digit',
  hour: '2-digit',
  minute: '2-digit',
  hour12: false,
})

export function formatMediaDate(iso: string): string {
  const date = new Date(iso)
  if (Number.isNaN(date.getTime())) return '—'
  return mediaDateFormatter.format(date).replace(/\//g, '-')
}

/* ------------------------------------------------------------------ state */

interface MediaListResponse {
  data: {
    items: AdminMediaItem[]
    total: number
    totalBytes: number
  }
}

interface MediaUploadResponse {
  data: {
    files: AdminMediaItem[]
  }
}

export function useAdminMedia() {
  const session = useState<{ csrfToken: string } | null>('admin-session')
  const items = useState<AdminMediaItem[]>('admin-media-items', () => [])
  const loaded = useState<boolean>('admin-media-loaded', () => false)
  const loading = useState<boolean>('admin-media-loading', () => false)

  const totalBytes = computed(() => items.value.reduce((sum, item) => sum + item.bytes, 0))

  function mutationHeaders(): Record<string, string> {
    return { 'X-CSRF-Token': session.value?.csrfToken || '' }
  }

  async function loadMedia(): Promise<void> {
    loading.value = true
    try {
      const response = await $fetch<MediaListResponse>('/api/admin/media', {
        query: { pageSize: 500, sort: 'newest' },
      })
      items.value = response.data.items
      loaded.value = true
    }
    finally {
      loading.value = false
    }
  }

  async function addFiles(files: File[]): Promise<{ added: AdminMediaItem[]; rejected: File[] }> {
    const accepted: File[] = []
    const rejected: File[] = []
    for (const file of files) {
      if (isSupportedMediaFile(file)) accepted.push(file)
      else rejected.push(file)
    }
    if (!accepted.length) return { added: [], rejected }

    const form = new FormData()
    for (const file of accepted) form.append('file', file, file.name)

    const response = await $fetch<MediaUploadResponse>('/api/admin/uploads', {
      method: 'POST',
      body: form,
      headers: mutationHeaders(),
    })

    const added = response.data.files
    items.value = [...added, ...items.value]
    return { added, rejected }
  }

  async function addCroppedImage(source: Pick<AdminMediaItem, 'name'>, blob: Blob, _width: number, _height: number): Promise<AdminMediaItem> {
    const baseName = source.name.replace(/\.[^.]+$/, '') || 'image'
    const file = new File([blob], `${baseName}-cropped.png`, { type: 'image/png' })
    const { added } = await addFiles([file])
    const item = added[0]
    if (!item) throw new Error('裁剪图片保存失败，请稍后重试')
    return item
  }

  async function renameItem(id: number, name: string): Promise<AdminMediaItem> {
    const response = await $fetch<{ data: AdminMediaItem }>(`/api/admin/media/${id}`, {
      method: 'PATCH',
      body: { name },
      headers: mutationHeaders(),
    })
    const updated = response.data
    items.value = items.value.map(item => (item.id === updated.id ? updated : item))
    return updated
  }

  async function removeItems(ids: number[]): Promise<void> {
    const uniqueIds = [...new Set(ids)]
    for (const id of uniqueIds) {
      await $fetch(`/api/admin/media/${id}`, { method: 'DELETE', headers: mutationHeaders() })
    }
    const removed = new Set(uniqueIds)
    items.value = items.value.filter(item => !removed.has(item.id))
  }

  return {
    items,
    totalBytes,
    loaded,
    loading,
    loadMedia,
    addFiles,
    addCroppedImage,
    renameItem,
    removeItems,
  }
}
