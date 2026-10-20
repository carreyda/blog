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

  const prisma = usePrisma()
  const [categories, bookmarks] = await Promise.all([
    prisma.bookmarkCategory.findMany({ select: { id: true, name: true, parentId: true } }),
    prisma.bookmark.findMany({
      where,
      orderBy: [{ sort: 'asc' }, { id: 'desc' }],
      include: {
        category: { select: { id: true, name: true, parentId: true } },
      },
    }),
  ])

  const categoryById = new Map(categories.map(category => [category.id, category]))
  const pathCache = new Map<number, string>()
  function categoryPath(categoryId: number): string {
    const cached = pathCache.get(categoryId)
    if (cached) return cached

    const names: string[] = []
    const visited = new Set<number>()
    let cursor: number | null = categoryId
    while (cursor !== null) {
      if (visited.has(cursor)) {
        names.unshift('未分类')
        break
      }
      visited.add(cursor)
      const category = categoryById.get(cursor)
      if (!category) {
        names.unshift('未分类')
        break
      }
      names.unshift(category.name)
      cursor = category.parentId
    }

    const path = names.join(' / ')
    pathCache.set(categoryId, path)
    return path
  }

  return {
    data: bookmarks.map(bookmark => ({ ...bookmark, categoryPath: categoryPath(bookmark.categoryId) })),
  }
})
