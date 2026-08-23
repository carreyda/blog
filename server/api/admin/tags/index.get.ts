export default defineEventHandler(async () => {
  const tags = await usePrisma().tag.findMany({
    orderBy: { name: 'asc' },
    select: { id: true, name: true, slug: true, _count: { select: { posts: true } } },
  })
  return { data: tags.map(tag => ({ ...tag, postCount: tag._count.posts, _count: undefined })) }
})
