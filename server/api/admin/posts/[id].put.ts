import { updatePostSchema } from '#shared/schemas/post'

export default defineEventHandler(async (event) => {
  const id = Number.parseInt(getRouterParam(event, 'id') || '', 10)
  if (!Number.isInteger(id) || id < 1) return apiError(event, 400, 'INVALID_ID', '文章 ID 无效')
  const parsed = updatePostSchema.safeParse(await readBody(event))
  if (!parsed.success) return apiError(event, 400, 'VALIDATION_ERROR', '请检查文章内容', zodFields(parsed.error))
  const { tagIds, ...content } = parsed.data
  await assertTagsExist(tagIds)

  const exists = await usePrisma().post.count({ where: { id } })
  if (!exists) return apiError(event, 404, 'POST_NOT_FOUND', '文章不存在')
  const post = await usePrisma().$transaction(async (tx) => {
    await tx.postTag.deleteMany({ where: { postId: id } })
    return tx.post.update({
      where: { id },
      data: { ...content, tags: { create: tagIds.map(tagId => ({ tagId })) } },
      select: adminPostSelect,
    })
  })
  return { data: serializeAdminPost(post) }
})
