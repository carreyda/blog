import type { MediaFormat } from '@prisma/client'

const MAX_FILES = 10
const MAX_FILE_BYTES = 10 * 1024 * 1024
const MAX_TOTAL_BYTES = 25 * 1024 * 1024

interface StagedImage {
  name: string
  mime: string
  buffer: Buffer
}

export default defineEventHandler(async (event) => {
  if (!isCosStorageConfigured(event)) {
    return apiError(event, 503, 'STORAGE_NOT_CONFIGURED', '图片存储尚未配置，暂时无法上传')
  }

  let parts: Awaited<ReturnType<typeof readMultipartFormData>>
  try {
    parts = await readMultipartFormData(event)
  }
  catch {
    return apiError(event, 400, 'INVALID_FORM', '无法读取上传内容，请重新选择图片')
  }

  const files = (parts ?? []).filter(part => part.filename && part.data && part.data.length > 0)
  if (!files.length) {
    return apiError(event, 400, 'NO_FILE', '请选择要上传的图片')
  }
  if (files.length > MAX_FILES) {
    return apiError(event, 400, 'TOO_MANY_FILES', `一次最多上传 ${MAX_FILES} 张图片`)
  }

  const totalBytes = files.reduce((sum, file) => sum + file.data.length, 0)
  if (totalBytes > MAX_TOTAL_BYTES) {
    return apiError(event, 413, 'REQUEST_TOO_LARGE', '一次上传的图片总大小不能超过 25MB')
  }

  const staged: StagedImage[] = []
  for (const file of files) {
    const name = sanitizeMediaName(file.filename || 'image')
    if (file.data.length > MAX_FILE_BYTES) {
      return apiError(event, 413, 'FILE_TOO_LARGE', `「${name}」超过 10MB，请压缩后再上传`)
    }
    const mime = sniffImageMime(file.data)
    if (!mime) {
      return apiError(event, 415, 'UNSUPPORTED_TYPE', `「${name}」不是受支持的图片格式，仅支持 PNG / JPG / WebP / GIF / AVIF`)
    }
    staged.push({ name, mime, buffer: file.data })
  }

  const uploaded: Array<{ name: string; key: string; url: string; format: MediaFormat; bytes: number; width: number; height: number }> = []
  try {
    for (const image of staged) {
      const result = await uploadImageToCos(event, image.buffer, image.mime)
      uploaded.push({ name: image.name, ...result })
    }
  }
  catch (error) {
    await Promise.all(uploaded.map(item => deleteCosObject(event, item.key).catch(() => {})))
    console.error('[media] COS upload failed', error)
    return apiError(event, 502, 'IMAGE_UPLOAD_FAILED', '图片上传到对象存储失败，请稍后重试')
  }

  let records
  try {
    records = await usePrisma().$transaction(
      uploaded.map(item => usePrisma().mediaAsset.create({
        data: {
          name: item.name,
          cosKey: item.key,
          url: item.url,
          width: item.width,
          height: item.height,
          bytes: item.bytes,
          format: item.format,
        },
      })),
    )
  }
  catch (error) {
    await Promise.all(uploaded.map(item => deleteCosObject(event, item.key).catch(() => {})))
    console.error('[media] failed to persist media assets', error)
    return apiError(event, 500, 'MEDIA_SAVE_FAILED', '图片已上传，但保存记录失败，请稍后重试')
  }

  setResponseStatus(event, 201)
  return { data: { files: records.map(serializeMediaAsset) } }
})
