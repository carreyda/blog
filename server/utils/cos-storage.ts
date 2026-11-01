import type { H3Event } from 'h3'
import type { MediaFormat } from '@prisma/client'
import { randomUUID } from 'node:crypto'
import COS from 'cos-nodejs-sdk-v5'
import { imageSize } from 'image-size'

interface CosRuntimeConfig {
  secretId: string
  secretKey: string
  bucket: string
  region: string
  publicBaseUrl: string
}

const MIME_BY_FORMAT: Record<MediaFormat, string> = {
  PNG: 'image/png',
  JPG: 'image/jpeg',
  WEBP: 'image/webp',
  GIF: 'image/gif',
  AVIF: 'image/avif',
}

const FORMAT_BY_MIME: Record<string, MediaFormat> = {
  'image/png': 'PNG',
  'image/jpeg': 'JPG',
  'image/webp': 'WEBP',
  'image/gif': 'GIF',
  'image/avif': 'AVIF',
}

const EXTENSION_BY_FORMAT: Record<MediaFormat, string> = {
  PNG: 'png',
  JPG: 'jpg',
  WEBP: 'webp',
  GIF: 'gif',
  AVIF: 'avif',
}

let cosClient: COS | null = null

function getCosConfig(event?: H3Event): CosRuntimeConfig | null {
  const config = useRuntimeConfig(event).cos as Partial<CosRuntimeConfig> | undefined
  if (!config?.secretId || !config.secretKey || !config.bucket || !config.region) return null
  return {
    secretId: config.secretId,
    secretKey: config.secretKey,
    bucket: config.bucket,
    region: config.region,
    publicBaseUrl: config.publicBaseUrl || '',
  }
}

export function isCosStorageConfigured(event?: H3Event): boolean {
  return getCosConfig(event) !== null
}

function getCosClient(): COS {
  const config = getCosConfig()
  if (!config) {
    throw createError({ statusCode: 503, statusMessage: 'COS storage is not configured' })
  }
  if (!cosClient) {
    cosClient = new COS({ SecretId: config.secretId, SecretKey: config.secretKey })
  }
  return cosClient
}

function buildPublicUrl(event: H3Event | undefined, key: string): string {
  const config = getCosConfig(event)
  if (!config) return ''
  const base = config.publicBaseUrl
    ? config.publicBaseUrl.replace(/\/+$/, '')
    : `https://${config.bucket}.cos.${config.region}.myqcloud.com`
  return `${base}/${key}`
}

function buildObjectKey(mime: string): string {
  const format = FORMAT_BY_MIME[mime]
  if (!format) throw createError({ statusCode: 415, statusMessage: 'Unsupported image type' })
  const monthKey = new Intl.DateTimeFormat('en-CA', {
    timeZone: 'Asia/Shanghai',
    year: 'numeric',
    month: '2-digit',
  }).format(new Date())
  const [year, month] = monthKey.split('-')
  return `images/${year}/${month}/${randomUUID()}.${EXTENSION_BY_FORMAT[format]}`
}

/**
 * Content sniffing keeps the bucket clean: the client-provided MIME type is
 * ignored, so a `.png` that is actually HTML never reaches COS.
 */
export function sniffImageMime(buffer: Buffer): string | null {
  if (buffer.length < 12) return null

  if (
    buffer.length >= 8
    && buffer[0] === 0x89
    && buffer[1] === 0x50
    && buffer[2] === 0x4e
    && buffer[3] === 0x47
    && buffer[4] === 0x0d
    && buffer[5] === 0x0a
    && buffer[6] === 0x1a
    && buffer[7] === 0x0a
  ) {
    return 'image/png'
  }

  if (buffer[0] === 0xff && buffer[1] === 0xd8 && buffer[2] === 0xff) return 'image/jpeg'

  const head = buffer.toString('latin1', 0, 12)
  if (head.startsWith('GIF87a') || head.startsWith('GIF89a')) return 'image/gif'
  if (head.slice(0, 4) === 'RIFF' && head.slice(8, 12) === 'WEBP') return 'image/webp'

  if (buffer.length >= 32 && buffer.toString('latin1', 4, 8) === 'ftyp') {
    const brands = buffer.toString('latin1', 8, 32)
    if (brands.includes('avif') || brands.includes('avis')) return 'image/avif'
  }

  return null
}

export interface ImageDimensions {
  width: number
  height: number
}

export function readImageDimensions(buffer: Buffer): ImageDimensions {
  try {
    const result = imageSize(buffer)
    const width = Number(result.width) || 0
    const height = Number(result.height) || 0
    return { width, height }
  }
  catch {
    return { width: 0, height: 0 }
  }
}

export interface UploadedImage {
  key: string
  url: string
  format: MediaFormat
  bytes: number
  width: number
  height: number
}

export async function uploadImageToCos(event: H3Event, buffer: Buffer, mime: string): Promise<UploadedImage> {
  const config = getCosConfig(event)
  if (!config) {
    throw createError({ statusCode: 503, statusMessage: 'COS storage is not configured' })
  }
  const format = FORMAT_BY_MIME[mime]
  if (!format) {
    throw createError({ statusCode: 415, statusMessage: 'Unsupported image type' })
  }

  const key = buildObjectKey(mime)
  const client = getCosClient()
  await client.putObject({
    Bucket: config.bucket,
    Region: config.region,
    Key: key,
    Body: buffer,
    ContentType: mime,
    CacheControl: 'public, max-age=31536000, immutable',
  })

  const dimensions = readImageDimensions(buffer)
  return {
    key,
    url: buildPublicUrl(event, key),
    format,
    bytes: buffer.length,
    width: dimensions.width,
    height: dimensions.height,
  }
}

export async function deleteCosObject(event: H3Event, key: string): Promise<void> {
  const config = getCosConfig(event)
  if (!config) return
  await getCosClient().deleteObject({ Bucket: config.bucket, Region: config.region, Key: key })
}

export interface CosObjectBody {
  body: Buffer
  contentType: string
}

export async function readCosObject(event: H3Event, key: string): Promise<CosObjectBody> {
  const config = getCosConfig(event)
  if (!config) {
    throw createError({ statusCode: 503, statusMessage: 'COS storage is not configured' })
  }
  const result = await getCosClient().getObject({
    Bucket: config.bucket,
    Region: config.region,
    Key: key,
  })
  const body = Buffer.isBuffer(result.Body) ? result.Body : Buffer.from(result.Body as string)
  const contentType = result.headers?.['content-type'] || 'application/octet-stream'
  return { body, contentType }
}

export function mimeForFormat(format: MediaFormat): string {
  return MIME_BY_FORMAT[format] || 'application/octet-stream'
}
