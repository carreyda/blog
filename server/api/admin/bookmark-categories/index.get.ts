export default defineEventHandler(async () => {
  const categories = await usePrisma().bookmarkCategory.findMany({
    where: { parentId: null },
    orderBy: [{ sort: 'asc' }, { id: 'asc' }],
    select: {
      id: true,
      name: true,
      parentId: true,
      sort: true,
      createdAt: true,
      updatedAt: true,
      _count: { select: { children: true, bookmarks: true } },
      children: {
        orderBy: [{ sort: 'asc' }, { id: 'asc' }],
        select: {
          id: true,
          name: true,
          parentId: true,
          sort: true,
          createdAt: true,
          updatedAt: true,
          _count: { select: { children: true, bookmarks: true } },
        },
      },
    },
  })

  return { data: categories }
})
