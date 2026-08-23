export default defineEventHandler(async (event) => {
  const id = Number.parseInt(getRouterParam(event, 'id') || '', 10)
  if (!Number.isInteger(id) || id < 1) return apiError(event, 400, 'INVALID_ID', '文章 ID 无效')
  const post = await usePrisma().post.findFirst({
    where: { id, status: 'PUBLISHED' },
    select: { ...publicPostListSelect, seoTitle: true, seoDescription: true },
  })
  if (!post) return apiError(event, 404, 'POST_NOT_FOUND', '文章不存在或已下线')
  const rendered = await renderMarkdown(post.contentMarkdown)
  return { data: { ...serializePublicPost(post), seoTitle: post.seoTitle, seoDescription: post.seoDescription, contentHtml: rendered.html, toc: rendered.toc } }
})
