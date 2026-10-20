export default defineEventHandler(async () => {
  const rows = await usePrisma().bookmarkCategory.findMany({
    orderBy: [{ sort: 'asc' }, { id: 'asc' }],
    select: {
      id: true,
      name: true,
      parentId: true,
      bookmarks: {
        where: { isVisible: true },
        orderBy: [{ sort: 'asc' }, { id: 'desc' }],
        select: { id: true, name: true, description: true, iconUrl: true, url: true },
      },
    },
  })

  type CategoryNode = (typeof rows)[number] & { children: CategoryNode[] }
  const nodes = new Map<number, CategoryNode>()
  for (const row of rows) nodes.set(row.id, { ...row, children: [] })

  const roots: CategoryNode[] = []
  for (const node of nodes.values()) {
    const parent = node.parentId === null ? null : nodes.get(node.parentId)
    if (parent) parent.children.push(node)
    else roots.push(node)
  }

  function prune(items: CategoryNode[]): CategoryNode[] {
    return items
      .map(item => ({ ...item, children: prune(item.children) }))
      .filter(item => item.bookmarks.length > 0 || item.children.length > 0)
  }

  return { data: prune(roots) }
})
