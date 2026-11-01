import type { MediaAsset } from '@prisma/client'

export const mediaAssetSelect = {
  id: true,
  name: true,
  cosKey: true,
  url: true,
  width: true,
  height: true,
  bytes: true,
  format: true,
  createdAt: true,
}

export const MEDIA_NAME_MAX_LENGTH = 255

/**
 * Normalizes a user supplied image name: strips path segments and characters
 * that are illegal in object names / database display, and keeps it non-empty.
 */
export function sanitizeMediaName(filename: string): string {
  const base = filename.replace(/[\\/]+/g, '/').split('/').pop() || 'image'
  const cleaned = base.replace(/[\u0000-\u001f<>:"|?*]/g, '').trim()
  return (cleaned || 'image').slice(0, MEDIA_NAME_MAX_LENGTH)
}

export interface SerializedMediaAsset {
  id: number
  name: string
  url: string
  width: number
  height: number
  bytes: number
  format: MediaAsset['format']
  createdAt: string
}

export function serializeMediaAsset(asset: Pick<MediaAsset, 'id' | 'name' | 'url' | 'width' | 'height' | 'bytes' | 'format' | 'createdAt'>): SerializedMediaAsset {
  return {
    id: asset.id,
    name: asset.name,
    url: asset.url,
    width: asset.width,
    height: asset.height,
    bytes: asset.bytes,
    format: asset.format,
    createdAt: asset.createdAt.toISOString(),
  }
}
