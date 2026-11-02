import { z } from 'zod'

const reorderSchema = z.object({
  entries: z.array(z.object({
    id: z.number().int().positive(),
    sort: z.number().int().min(-9999).max(9999),
  }).strict()).min(1).max(200),
}).strict()

export default defineEventHandler(async (event) => {
  const parsed = reorderSchema.safeParse(await readBody(event))
  if (!parsed.success) return apiError(event, 400, 'VALIDATION_ERROR', '排序参数无效', zodFields(parsed.error))

  const entries = parsed.data.entries
  const ids = entries.map((entry) => entry.id)
  if (new Set(ids).size !== ids.length) {
    return apiError(event, 400, 'VALIDATION_ERROR', '排序列表中存在重复的收藏')
  }

  const prisma = usePrisma()
  const existing = await prisma.bookmark.findMany({ where: { id: { in: ids } }, select: { id: true } })
  if (existing.length !== ids.length) {
    return apiError(event, 404, 'NOT_FOUND', '部分收藏已不存在，请刷新后重试')
  }

  // The client sends the target sort slot per row so a drag inside one category
  // group can reuse that group's existing slots instead of renumbering everything.
  await prisma.$transaction(
    entries.map((entry) => prisma.bookmark.update({ where: { id: entry.id }, data: { sort: entry.sort } })),
  )

  const [categories, bookmarks] = await Promise.all([
    prisma.bookmarkCategory.findMany({ select: { id: true, name: true, parentId: true } }),
    prisma.bookmark.findMany({
      orderBy: [{ sort: 'asc' }, { id: 'desc' }],
      include: { category: { select: { id: true, name: true, parentId: true } } },
    }),
  ])

  return { data: withCategoryPaths(bookmarks, categories) }
})
