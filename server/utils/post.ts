export const adminPostSelect = {
  id: true,
  title: true,
  summary: true,
  contentMarkdown: true,
  coverImageUrl: true,
  status: true,
  seoTitle: true,
  seoDescription: true,
  publishedAt: true,
  viewCount: true,
  createdAt: true,
  updatedAt: true,
  tags: {
    select: { tag: { select: { id: true, name: true, slug: true } } },
    orderBy: { tag: { name: 'asc' as const } },
  },
}

export function serializeAdminPost(post: any) {
  return { ...post, tags: post.tags.map((item: any) => item.tag) }
}

export async function assertTagsExist(tagIds: number[]) {
  if (!tagIds.length) return
  const count = await usePrisma().tag.count({ where: { id: { in: tagIds } } })
  if (count !== tagIds.length) {
    throw createError({ statusCode: 400, statusMessage: 'One or more tags do not exist' })
  }
}
