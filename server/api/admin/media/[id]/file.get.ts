/**
 * Streams the original object back through Nitro.
 *
 * The crop editor draws the image onto a canvas, so the source must be
 * same-origin: loading the public COS URL directly would taint the canvas and
 * make `toBlob()` throw. Proxying also keeps working when the bucket policy
 * later drops public read access.
 */
export default defineEventHandler(async (event) => {
  const id = Number.parseInt(getRouterParam(event, 'id') || '', 10)
  if (!Number.isInteger(id) || id < 1) return apiError(event, 400, 'INVALID_ID', '图片 ID 无效')

  const asset = await usePrisma().mediaAsset.findUnique({ where: { id }, select: { cosKey: true } })
  if (!asset) return apiError(event, 404, 'MEDIA_NOT_FOUND', '图片不存在')

  if (!isCosStorageConfigured(event)) {
    return apiError(event, 503, 'STORAGE_NOT_CONFIGURED', '图片存储尚未配置，暂时无法读取图片')
  }

  try {
    const object = await readCosObject(event, asset.cosKey)
    setResponseHeaders(event, {
      'Content-Type': object.contentType,
      'Cache-Control': 'private, max-age=300',
      'Content-Length': String(object.body.length),
    })
    return object.body
  }
  catch (error) {
    console.error('[media] COS getObject failed', error)
    return apiError(event, 502, 'IMAGE_FETCH_FAILED', '读取图片失败，请稍后重试')
  }
})
