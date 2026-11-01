import { MEDIA_NAME_MAX_LENGTH } from '../../../utils/media'

export default defineEventHandler(async (event) => {
  const id = Number(getRouterParam(event, 'id'))
  if (!Number.isInteger(id) || id <= 0) {
    return apiError(event, 400, 'INVALID_ID', '无效的图片编号')
  }

  let body: { name?: unknown } | null = null
  try {
    body = await readBody<{ name?: unknown }>(event)
  }
  catch {
    return apiError(event, 400, 'INVALID_BODY', '无法读取请求内容')
  }

  const trimmed = typeof body?.name === 'string' ? body.name.trim() : ''
  if (!trimmed) {
    return apiError(event, 400, 'INVALID_NAME', '请输入图片名称')
  }
  if (trimmed.length > MEDIA_NAME_MAX_LENGTH) {
    return apiError(event, 400, 'INVALID_NAME', `图片名称不能超过 ${MEDIA_NAME_MAX_LENGTH} 个字符`)
  }

  const asset = await usePrisma().mediaAsset.findUnique({ where: { id } })
  if (!asset) {
    return apiError(event, 404, 'MEDIA_NOT_FOUND', '图片不存在或已被删除')
  }

  const updated = await usePrisma().mediaAsset.update({
    where: { id },
    data: { name: sanitizeMediaName(trimmed) },
  })

  return { data: serializeMediaAsset(updated) }
})
