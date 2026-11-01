export default defineEventHandler(async (event) => {
  const id = Number.parseInt(getRouterParam(event, 'id') || '', 10)
  if (!Number.isInteger(id) || id < 1) return apiError(event, 400, 'INVALID_ID', '图片 ID 无效')

  const asset = await usePrisma().mediaAsset.findUnique({ where: { id }, select: { id: true, cosKey: true } })
  if (!asset) return apiError(event, 404, 'MEDIA_NOT_FOUND', '图片不存在')

  if (!isCosStorageConfigured(event)) {
    return apiError(event, 503, 'STORAGE_NOT_CONFIGURED', '图片存储尚未配置，暂时无法删除')
  }

  try {
    await deleteCosObject(event, asset.cosKey)
  }
  catch (error) {
    console.error('[media] COS delete failed', error)
    return apiError(event, 502, 'IMAGE_DELETE_FAILED', '删除对象存储中的图片失败，请稍后重试')
  }

  await usePrisma().mediaAsset.delete({ where: { id } })
  setResponseStatus(event, 204)
  return null
})
