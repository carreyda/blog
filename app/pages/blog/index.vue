<script setup lang="ts">
type Tag = { id: number; name: string; slug: string }
type TagSummary = Tag & { postCount: number }
type Post = { id: number; title: string; summary: string; coverImageUrl: string | null; publishedAt: string; readingMinutes: number; tags: Tag[] }
const route = useRoute()
const router = useRouter()
const page = computed(() => Math.max(1, Number.parseInt(String(route.query.page || '1'), 10) || 1))
const searchInput = ref(String(route.query.q || ''))
const query = computed(() => ({ page: page.value, pageSize: 10, q: route.query.q || undefined, tag: route.query.tag || undefined }))
const { data: response, pending } = await useFetch<{ data: { items: Post[]; total: number; pageSize: number } }>('/api/posts', { query })
const { data: tagsResponse } = await useFetch<{ data: TagSummary[] }>('/api/tags')
const posts = computed(() => response.value?.data.items || [])
const total = computed(() => response.value?.data.total || 0)
const tags = computed(() => tagsResponse.value?.data || [])
const currentTag = computed(() => tags.value.find(tag => tag.slug === String(route.query.tag || '')))
const pageTitle = computed(() => route.query.tag ? `# ${currentTag.value?.name || route.query.tag}` : '文章')
useSeoMeta({ title: '文章', description: '技术文章与学习记录' })
watch(() => route.query.q, value => { searchInput.value = String(value || '') })
function search() {
  const q = searchInput.value.trim()
  searchInput.value = q
  router.push({ query: { ...(q ? { q } : {}), ...(route.query.tag ? { tag: route.query.tag } : {}) } })
}
function clearSearch() {
  searchInput.value = ''
  search()
}
function changePage(value: number) {
  router.push({ query: { ...route.query, page: value > 1 ? value : undefined } })
}
function tagLink(slug?: string) {
  return {
    path: '/blog',
    query: {
      ...(slug ? { tag: slug } : {}),
      ...(route.query.q ? { q: String(route.query.q) } : {}),
    },
  }
}
</script>

<template>
  <section class="blog-page">
    <aside class="blog-sidebar">
      <p class="eyebrow">WRITING</p>
      <h1>{{ pageTitle }}</h1>
      <p class="lead">记录技术实践、工程思考与持续学习。</p>

      <form class="blog-search" role="search" @submit.prevent="search">
        <UIcon name="i-lucide-search" class="search-icon" aria-hidden="true" />
        <input v-model="searchInput" type="search" aria-label="搜索文章" placeholder="搜索标题、摘要或标签">
        <button v-if="searchInput" class="clear-search" type="button" aria-label="清除搜索" title="清除" @click="clearSearch">
          <UIcon name="i-lucide-x" />
        </button>
        <button class="search-submit" type="submit" aria-label="搜索">
          <UIcon name="i-lucide-arrow-right" />
        </button>
      </form>
      <p v-if="route.query.q && !pending" class="search-result">找到 <strong>{{ total }}</strong> 篇与“{{ route.query.q }}”相关的文章</p>
      <p v-else class="post-count">共 <strong>{{ total }}</strong> 篇文章</p>

      <nav class="tag-filter" aria-label="按标签筛选">
        <p class="filter-label">标签</p>
        <NuxtLink
          :to="tagLink()"
          :class="{ active: !route.query.tag }"
          :aria-current="!route.query.tag ? 'page' : undefined"
        >
          <span>全部</span>
        </NuxtLink>
        <NuxtLink
          v-for="tag in tags"
          :key="tag.id"
          :to="tagLink(tag.slug)"
          :class="{ active: route.query.tag === tag.slug }"
          :aria-current="route.query.tag === tag.slug ? 'page' : undefined"
        >
          <span>{{ tag.name }}</span>
          <span class="tag-count">{{ tag.postCount }}</span>
        </NuxtLink>
      </nav>
    </aside>

    <div class="blog-list-area">
      <div v-if="pending" class="empty">正在加载文章…</div>
      <div v-else-if="!posts.length" class="empty">暂无匹配的文章</div>
      <div v-else class="post-list">
        <article v-for="post in posts" :key="post.id" class="post-card">
          <NuxtLink :to="`/blog/${post.id}`" :class="['post-link', { 'has-cover': post.coverImageUrl }]">
            <img v-if="post.coverImageUrl" :src="post.coverImageUrl" :alt="post.title" loading="lazy">
            <div>
              <div class="post-meta">
                <time :datetime="post.publishedAt">{{ new Date(post.publishedAt).toLocaleDateString('zh-CN') }}</time>
                <span>·</span>
                <span>{{ post.readingMinutes }} 分钟阅读</span>
              </div>
              <h2>{{ post.title }}</h2>
              <p>{{ post.summary }}</p>
            </div>
          </NuxtLink>
          <div v-if="post.tags.length" class="tags">
            <NuxtLink v-for="tag in post.tags" :key="tag.id" :to="`/tags/${tag.slug}`">#{{ tag.name }}</NuxtLink>
          </div>
        </article>
      </div>

      <nav v-if="total > 10" class="pagination" aria-label="文章分页">
        <button :disabled="page <= 1" @click="changePage(page - 1)">上一页</button>
        <span>第 {{ page }} / {{ Math.ceil(total / 10) }} 页</span>
        <button :disabled="page >= Math.ceil(total / 10)" @click="changePage(page + 1)">下一页</button>
      </nav>
    </div>
  </section>
</template>

<style scoped>
.blog-page {
  display: grid;
  grid-template-columns: 252px minmax(0, 1fr);
  align-items: start;
  gap: 60px;
}

.blog-sidebar {
  position: sticky;
  top: calc(var(--site-header-height) + 26px);
  align-self: start;
  max-height: calc(100vh - var(--site-header-height) - 52px);
  padding-right: 4px;
  overflow-y: auto;
  overscroll-behavior: contain;
  scrollbar-width: thin;
}

.blog-sidebar h1 {
  margin: 0 0 12px;
  font-size: 34px;
  line-height: 1.15;
  letter-spacing: -.05em;
}

.blog-sidebar .lead {
  max-width: 240px;
  margin: 0 0 28px;
  font-size: 13px;
  line-height: 1.8;
}

.blog-search {
  display: flex;
  min-height: 42px;
  align-items: center;
  gap: 5px;
  padding: 4px 5px 4px 12px;
  border: 1px solid var(--color-border);
  border-radius: 10px;
  background: var(--color-background-secondary);
  transition: border-color .16s ease, box-shadow .16s ease, background .16s ease;
}

.blog-search:focus-within {
  border-color: color-mix(in srgb, var(--color-primary) 65%, var(--color-border));
  background: var(--color-background);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-primary) 10%, transparent);
}

.search-icon {
  width: 15px;
  height: 15px;
  flex: 0 0 auto;
  color: var(--color-text-muted);
}

.blog-search input {
  min-width: 0;
  flex: 1;
  padding: 8px 4px;
  border: 0;
  outline: 0;
  background: transparent;
  color: inherit;
  font: inherit;
  font-size: 12px;
}

.blog-search input::-webkit-search-cancel-button {
  display: none;
}

.clear-search {
  display: grid;
  width: 26px;
  height: 26px;
  flex: 0 0 auto;
  place-items: center;
  padding: 0;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: var(--color-text-secondary);
  cursor: pointer;
}

.clear-search:hover {
  background: var(--color-background-secondary);
  color: var(--color-text);
}

.clear-search svg {
  width: 14px;
  height: 14px;
}

.search-submit {
  display: grid;
  width: 30px;
  height: 30px;
  flex: 0 0 auto;
  place-items: center;
  padding: 0;
  border: 0;
  border-radius: 7px;
  background: transparent;
  color: var(--color-text-secondary);
  cursor: pointer;
  transition: color .16s ease, background .16s ease;
}

.search-submit:hover {
  color: var(--color-primary);
  background: var(--color-background);
}

.search-submit:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 1px;
}

.search-submit svg {
  width: 15px;
  height: 15px;
}

.search-result,
.post-count {
  margin: 10px 2px 0;
  color: var(--color-text-secondary);
  font-size: 11px;
}

.search-result strong,
.post-count strong {
  color: var(--color-text);
  font-weight: 650;
}

.tag-filter {
  display: grid;
  gap: 2px;
  margin-top: 28px;
  padding-top: 20px;
  border-top: 1px solid var(--color-border);
}

.filter-label {
  margin: 0 0 8px;
  color: var(--color-text-muted);
  font-size: 10px;
  letter-spacing: .12em;
  text-transform: uppercase;
}

.tag-filter a {
  display: flex;
  min-height: 32px;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 0 8px;
  border-radius: 6px;
  color: var(--color-text-secondary);
  font-size: 12px;
  transition: color .15s ease, background .15s ease;
}

.tag-filter a .tag-count {
  color: var(--color-text-muted);
  font-size: 10px;
  font-variant-numeric: tabular-nums;
}

.tag-filter a:hover {
  color: var(--color-text);
  background: var(--color-background-secondary);
}

.tag-filter a.active {
  color: var(--color-primary);
  background: color-mix(in srgb, var(--color-primary) 9%, transparent);
}

.tag-filter a.active .tag-count {
  color: var(--color-primary);
}

.blog-list-area {
  min-width: 0;
}

.post-list {
  display: grid;
}

.post-card {
  padding: 26px 0;
  border-bottom: 1px solid var(--color-border);
}

.post-card:first-child {
  padding-top: 0;
}

.post-link {
  display: grid;
  grid-template-columns: 1fr;
  gap: 20px;
}

.post-link.has-cover {
  grid-template-columns: 150px 1fr;
}

.post-link img {
  width: 150px;
  height: 100px;
  border-radius: var(--radius-sm);
  object-fit: cover;
}

.post-meta {
  display: flex;
  gap: 8px;
  color: var(--color-text-secondary);
  font-size: 11px;
}

.post-card h2 {
  margin: 8px 0;
  font-size: 21px;
  letter-spacing: -.025em;
  transition: color .15s ease;
}

.post-card:hover h2 {
  color: var(--color-primary);
}

.post-card p {
  margin: 0;
  color: var(--color-text-secondary);
  font-size: 13px;
  line-height: 1.7;
}

.tags {
  display: flex;
  flex-wrap: wrap;
  gap: 9px;
  margin-top: 12px;
  color: var(--color-primary);
  font-size: 11px;
}

.pagination {
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 16px;
  margin-top: 28px;
  font-size: 12px;
}

.pagination button {
  padding: 8px 14px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-sm);
  background: transparent;
  color: var(--color-text-secondary);
  cursor: pointer;
  transition: color .15s ease, border-color .15s ease;
}

.pagination button:hover:not(:disabled) {
  border-color: var(--color-primary);
  color: var(--color-primary);
}

.pagination button:disabled {
  cursor: not-allowed;
  opacity: .4;
}

.empty {
  padding: 60px 0;
  color: var(--color-text-secondary);
  text-align: center;
}

@media (max-width: 900px) {
  .blog-page {
    grid-template-columns: 1fr;
    gap: 30px;
  }

  .blog-sidebar {
    position: static;
    max-height: none;
    padding-right: 0;
    overflow: visible;
  }

  .blog-sidebar h1 {
    font-size: 30px;
  }

  .blog-sidebar .lead {
    max-width: 560px;
    margin-bottom: 22px;
  }

  .tag-filter {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin-top: 20px;
    padding-top: 16px;
  }

  .filter-label {
    width: 100%;
    margin-bottom: 2px;
  }

  .tag-filter a {
    min-height: 28px;
    padding: 0 10px;
    border: 1px solid var(--color-border);
  }

  .tag-filter a .tag-count {
    display: none;
  }
}

@media (max-width: 560px) {
  .blog-search {
    padding-left: 10px;
  }

  .post-link.has-cover {
    grid-template-columns: 1fr;
  }

  .post-link img {
    width: 100%;
    height: 160px;
  }
}
</style>
