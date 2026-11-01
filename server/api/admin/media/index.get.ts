import type { MediaFormat, Prisma } from '@prisma/client'

const SORTABLE = new Set(['newest', 'oldest', 'name', 'size'])
const FORMATS = new Set<MediaFormat>(['PNG', 'JPG', 'WEBP', 'GIF', 'AVIF'])

export default defineEventHandler(async (event) => {
  const query = getQuery(event)
  const page = Math.max(1, Number.parseInt(String(query.page || '1'), 10) || 1)
  const pageSize = Math.min(500, Math.max(1, Number.parseInt(String(query.pageSize || '60'), 10) || 60))
  const q = String(query.q || '').trim().slice(0, 200)
  const format = typeof query.format === 'string' && FORMATS.has(query.format as MediaFormat)
    ? query.format as MediaFormat
    : undefined
  const sort = typeof query.sort === 'string' && SORTABLE.has(query.sort) ? query.sort : 'newest'

  const where: Prisma.MediaAssetWhereInput = {
    ...(q ? { name: { contains: q, mode: 'insensitive' as const } } : {}),
    ...(format ? { format } : {}),
  }

  const orderBy: Prisma.MediaAssetOrderByWithRelationInput[] = sort === 'oldest'
    ? [{ createdAt: 'asc' }, { id: 'asc' }]
    : sort === 'name'
      ? [{ name: 'asc' }, { id: 'asc' }]
      : sort === 'size'
        ? [{ bytes: 'desc' }, { id: 'desc' }]
        : [{ createdAt: 'desc' }, { id: 'desc' }]

  const [items, total, bytes] = await usePrisma().$transaction([
    usePrisma().mediaAsset.findMany({
      where,
      orderBy,
      skip: (page - 1) * pageSize,
      take: pageSize,
      select: mediaAssetSelect,
    }),
    usePrisma().mediaAsset.count({ where }),
    usePrisma().mediaAsset.aggregate({ _sum: { bytes: true } }),
  ])

  return {
    data: {
      items: items.map(serializeMediaAsset),
      total,
      page,
      pageSize,
      totalBytes: bytes._sum.bytes ?? 0,
    },
  }
})
