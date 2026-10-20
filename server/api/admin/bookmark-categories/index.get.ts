export default defineEventHandler(async () => {
  const rows = await usePrisma().bookmarkCategory.findMany({
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

  return { data: roots }
})
