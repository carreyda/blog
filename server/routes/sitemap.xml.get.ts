function xml(value: string) {
  return value.replace(/[<>&'"]/g, c => ({
    '<': '&lt;',
    '>': '&gt;',
    '&': '&amp;',
    "'": '&apos;',
    '"': '&quot;',
  }[c]!))
}

export default defineEventHandler(async (event) => {
  const base = useRuntimeConfig(event).public.siteUrl.replace(/\/$/, '')
  const [posts, tags] = await Promise.all([
    usePrisma().post.findMany({
      where: { status: 'PUBLISHED' },
      select: { id: true, updatedAt: true },
    }),
    usePrisma().tag.findMany({
      where: { posts: { some: { post: { status: 'PUBLISHED' } } } },
      select: { slug: true, updatedAt: true },
    }),
  ])

  const urls = [
    { path: '/', date: new Date() },
    { path: '/blog', date: new Date() },
    { path: '/projects', date: new Date() },
    { path: '/bookmarks', date: new Date() },
    { path: '/about', date: new Date() },
    ...posts.map(post => ({ path: `/blog/${post.id}`, date: post.updatedAt })),
    ...tags.map(tag => ({ path: `/tags/${encodeURIComponent(tag.slug)}`, date: tag.updatedAt })),
  ]
  const entries = urls
    .map(item => `<url><loc>${xml(base + item.path)}</loc><lastmod>${item.date.toISOString()}</lastmod></url>`)
    .join('')

  setHeader(event, 'content-type', 'application/xml; charset=utf-8')
  return `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">${entries}</urlset>`
})
