type CategoryRow = { id: number; name: string; parentId: number | null }

/** Attaches the human-readable `A / B / C` path to each bookmark row. */
export function withCategoryPaths<T extends { categoryId: number }>(bookmarks: T[], categories: CategoryRow[]) {
  const categoryById = new Map(categories.map((category) => [category.id, category]))
  const pathCache = new Map<number, string>()

  function categoryPath(categoryId: number): string {
    const cached = pathCache.get(categoryId)
    if (cached) return cached

    const names: string[] = []
    const visited = new Set<number>()
    let cursor: number | null = categoryId
    while (cursor !== null) {
      if (visited.has(cursor)) {
        names.unshift('未分类')
        break
      }
      visited.add(cursor)
      const category = categoryById.get(cursor)
      if (!category) {
        names.unshift('未分类')
        break
      }
      names.unshift(category.name)
      cursor = category.parentId
    }

    const path = names.join(' / ')
    pathCache.set(categoryId, path)
    return path
  }

  return bookmarks.map((bookmark) => ({ ...bookmark, categoryPath: categoryPath(bookmark.categoryId) }))
}
