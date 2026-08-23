import type { Prisma, PostStatus } from '@prisma/client'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const page = Math.max(1, Number.parseInt(String(query.page || '1'), 10) || 1)
  const pageSize = Math.min(50, Math.max(1, Number.parseInt(String(query.pageSize || '20'), 10) || 20))
  const q = String(query.q || '').trim().slice(0, 200)
  const status: PostStatus | undefined = query.status === 'PUBLISHED' || query.status === 'ARCHIVED' ? query.status : undefined
  const tagId = Number.parseInt(String(query.tagId || ''), 10)
  const where: Prisma.PostWhereInput = {
    ...(q ? { title: { contains: q, mode: 'insensitive' as const } } : {}),
    ...(status ? { status } : {}),
    ...(Number.isInteger(tagId) && tagId > 0 ? { tags: { some: { tagId } } } : {}),
  }

  const [items, total] = await usePrisma().$transaction([
    usePrisma().post.findMany({
      where,
      orderBy: [{ updatedAt: 'desc' }, { id: 'desc' }],
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: adminPostSelect,
    }),
    usePrisma().post.count({ where }),
  ])

  return { data: { items: items.map(serializeAdminPost), total, page, pageSize } }
})
