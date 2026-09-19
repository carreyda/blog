import type { Prisma } from '@prisma/client'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const where: Prisma.BookmarkWhereInput = {}

  if (query.categoryId !== undefined && query.categoryId !== '') {
    const categoryId = Number.parseInt(String(query.categoryId), 10)
    if (!Number.isInteger(categoryId) || categoryId < 1) {
      return apiError(event, 400, 'VALIDATION_ERROR', '分类筛选条件无效')
    }
    where.categoryId = categoryId
  }

  if (query.visible !== undefined && query.visible !== '') {
    if (query.visible !== 'true' && query.visible !== 'false') {
      return apiError(event, 400, 'VALIDATION_ERROR', '可见性筛选条件无效')
    }
    where.isVisible = query.visible === 'true'
  }

  const keyword = String(query.q || '').trim()
  if (keyword.length > 200) return apiError(event, 400, 'VALIDATION_ERROR', '搜索关键词过长')
  if (keyword) {
    where.OR = [
      { name: { contains: keyword, mode: 'insensitive' } },
      { description: { contains: keyword, mode: 'insensitive' } },
      { url: { contains: keyword, mode: 'insensitive' } },
    ]
  }

  const bookmarks = await usePrisma().bookmark.findMany({
    where,
    orderBy: [{ sort: 'asc' }, { id: 'desc' }],
    include: {
      category: {
        select: { id: true, name: true, parent: { select: { id: true, name: true } } },
      },
    },
  })
  return { data: bookmarks }
})
