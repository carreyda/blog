export default defineEventHandler(async (event) => {
  const id = Number.parseInt(getRouterParam(event, 'id') || '', 10)
  if (!Number.isInteger(id) || id < 1) return apiError(event, 400, 'INVALID_ID', '分类 ID 无效')

  const result = await usePrisma().$transaction(async (tx) => {
    const category = await tx.bookmarkCategory.findUnique({
      where: { id },
      include: { _count: { select: { children: true, bookmarks: true } } },
    })
    if (!category) return 'NOT_FOUND' as const
    if (category._count.children > 0 || category._count.bookmarks > 0) return 'NOT_EMPTY' as const
    await tx.bookmarkCategory.delete({ where: { id } })
    return 'DELETED' as const
  })

  if (result === 'NOT_FOUND') return apiError(event, 404, 'BOOKMARK_CATEGORY_NOT_FOUND', '分类不存在')
  if (result === 'NOT_EMPTY') return apiError(event, 409, 'BOOKMARK_CATEGORY_NOT_EMPTY', '请先删除该分类下的子分类或收藏')
  setResponseStatus(event, 204)
  return null
})
