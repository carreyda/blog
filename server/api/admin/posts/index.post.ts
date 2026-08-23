import { createPostSchema } from '#shared/schemas/post'

export default defineEventHandler(async (event) => {
  const parsed = createPostSchema.safeParse(await readBody(event))
  if (!parsed.success) return apiError(event, 400, 'VALIDATION_ERROR', '请检查文章内容', zodFields(parsed.error))
  const { tagIds, ...content } = parsed.data
  await assertTagsExist(tagIds)

  const post = await usePrisma().post.create({
    data: {
      ...content,
      status: 'PUBLISHED',
      tags: { create: tagIds.map(tagId => ({ tagId })) },
    },
    select: adminPostSelect,
  })
  setResponseStatus(event, 201)
  return { data: serializeAdminPost(post) }
})
