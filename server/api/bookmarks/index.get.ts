export default defineEventHandler(async () => {
  const categories = await usePrisma().bookmarkCategory.findMany({
    where: {
      parentId: null,
      children: { some: { bookmarks: { some: { isVisible: true } } } },
    },
    orderBy: [{ sort: 'asc' }, { id: 'asc' }],
    select: {
      id: true,
      name: true,
      children: {
        where: { bookmarks: { some: { isVisible: true } } },
        orderBy: [{ sort: 'asc' }, { id: 'asc' }],
        select: {
          id: true,
          name: true,
          bookmarks: {
            where: { isVisible: true },
            orderBy: [{ sort: 'asc' }, { id: 'desc' }],
            select: { id: true, name: true, description: true, iconUrl: true, url: true },
          },
        },
      },
    },
  })

  return { data: categories }
})
