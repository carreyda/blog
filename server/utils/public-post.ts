export const publicPostListSelect = {
  id: true,
  title: true,
  summary: true,
  coverImageUrl: true,
  publishedAt: true,
  updatedAt: true,
  contentMarkdown: true,
  tags: { select: { tag: { select: { id: true, name: true, slug: true } } }, orderBy: { tag: { name: 'asc' as const } } },
}

export function serializePublicPost(post: any) {
  return {
    ...post,
    readingMinutes: readingMinutes(post.contentMarkdown),
    tags: post.tags.map((item: any) => item.tag),
    contentMarkdown: undefined,
  }
}
