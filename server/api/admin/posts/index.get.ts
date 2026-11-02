import type { Prisma, PostStatus } from '@prisma/client'

const SORT_FIELDS = ['updatedAt', 'createdAt', 'viewCount', 'title'] as const
type SortField = (typeof SORT_FIELDS)[number]

function parseSortField(value: unknown): SortField {
  const field = String(value || '')
  return (SORT_FIELDS as readonly string[]).includes(field) ? (field as SortField) : 'updatedAt'
}

function parseOrder(value: unknown): Prisma.SortOrder {
  return String(value || '').toLowerCase() === 'asc' ? 'asc' : 'desc'
}

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const page = Math.max(1, Number.parseInt(String(query.page || '1'), 10) || 1)
  const pageSize = Math.min(50, Math.max(1, Number.parseInt(String(query.pageSize || '20'), 10) || 20))
  const q = String(query.q || '').trim().slice(0, 200)
  const status: PostStatus | undefined = query.status === 'PUBLISHED' || query.status === 'ARCHIVED' ? query.status : undefined
  const tagId = Number.parseInt(String(query.tagId || ''), 10)
  const sort = parseSortField(query.sort)
  const order = parseOrder(query.order)
  const where: Prisma.PostWhereInput = {
    ...(q ? { title: { contains: q, mode: 'insensitive' as const } } : {}),
    ...(status ? { status } : {}),
    ...(Number.isInteger(tagId) && tagId > 0 ? { tags: { some: { tagId } } } : {}),
  }

  const [items, total] = await usePrisma().$transaction([
    usePrisma().post.findMany({
      where,
      // Sort by the requested column, then fall back to id so pagination stays stable.
      orderBy: [{ [sort]: order }, { id: 'desc' }] as Prisma.PostOrderByWithRelationInput[],
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: adminPostSelect,
    }),
    usePrisma().post.count({ where }),
  ])

  return { data: { items: items.map(serializeAdminPost), total, page, pageSize, sort, order } }
})
