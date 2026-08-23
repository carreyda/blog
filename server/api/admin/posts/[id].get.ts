export default defineEventHandler(async (event) => {
  const id = Number.parseInt(getRouterParam(event, 'id') || '', 10)
  if (!Number.isInteger(id) || id < 1) return apiError(event, 400, 'INVALID_ID', '文章 ID 无效')
  const post = await usePrisma().post.findUnique({ where: { id }, select: adminPostSelect })
  if (!post) return apiError(event, 404, 'POST_NOT_FOUND', '文章不存在')
  return { data: serializeAdminPost(post) }
})
