import type { Prisma } from '@prisma/client'

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const page = Math.max(1, Number.parseInt(String(query.page || '1'), 10) || 1)
  const pageSize = Math.min(50, Math.max(1, Number.parseInt(String(query.pageSize || '10'), 10) || 10))
  const q = String(query.q || '').trim().slice(0, 200)
  const tag = String(query.tag || '').trim().toLowerCase().slice(0, 60)
  const where: Prisma.PostWhereInput = {
    status: 'PUBLISHED',
    ...(tag ? { tags: { some: { tag: { slug: tag } } } } : {}),
    ...(q ? { OR: [
      { title: { contains: q, mode: 'insensitive' } },
      { summary: { contains: q, mode: 'insensitive' } },
      { tags: { some: { tag: { name: { contains: q, mode: 'insensitive' } } } } },
    ] } : {}),
  }
  const [items, total] = await usePrisma().$transaction([
    usePrisma().post.findMany({ where, orderBy: [{ publishedAt: 'desc' }, { id: 'desc' }], skip: (page - 1) * pageSize, take: pageSize, select: publicPostListSelect }),
    usePrisma().post.count({ where }),
  ])
  return { data: { items: items.map(serializePublicPost), total, page, pageSize } }
})
