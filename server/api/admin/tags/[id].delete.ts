export default defineEventHandler(async (event) => {
  const id = Number.parseInt(getRouterParam(event, 'id') || '', 10)
  if (!Number.isInteger(id) || id < 1) return apiError(event, 400, 'INVALID_ID', '标签 ID 无效')
  const result = await usePrisma().tag.deleteMany({ where: { id } })
  if (!result.count) return apiError(event, 404, 'TAG_NOT_FOUND', '标签不存在')
  setResponseStatus(event, 204)
  return null
})
