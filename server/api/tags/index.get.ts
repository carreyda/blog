export default defineEventHandler(async () => {
  const tags = await usePrisma().tag.findMany({
    where: { posts: { some: { post: { status: 'PUBLISHED' } } } },
    orderBy: { name: 'asc' },
    select: { id: true, name: true, slug: true, _count: { select: { posts: { where: { post: { status: 'PUBLISHED' } } } } } },
  })
  return { data: tags.map(tag => ({ id: tag.id, name: tag.name, slug: tag.slug, postCount: tag._count.posts })) }
})
