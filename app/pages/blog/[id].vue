<script setup lang="ts">
type Tag = { id: number; name: string; slug: string }
type TocItem = { id: string; text: string; level: number }
type Post = { id: number; title: string; summary: string; coverImageUrl: string | null; publishedAt: string; updatedAt: string; readingMinutes: number; tags: Tag[]; seoTitle: string | null; seoDescription: string | null; contentHtml: string; toc: TocItem[] }
type RelatedPost = { id: number; title: string; publishedAt: string; readingMinutes: number }
const route = useRoute()
const { data: response, error } = await useFetch<{ data: Post }>(`/api/posts/${route.params.id}`)
if (error.value || !response.value?.data) throw createError({ statusCode: error.value?.statusCode || 404, statusMessage: '文章不存在或已下线' })
const post = computed(() => response.value!.data)

const { data: relatedResponse } = await useFetch<{ data: { items: RelatedPost[] } }>('/api/posts', {
  query: { page: 1, pageSize: 6 },
})
const related = computed(() => (relatedResponse.value?.data.items || [])
  .filter(item => item.id !== post.value.id)
  .slice(0, 4))

const hasSide = computed(() => post.value.toc.length > 0 || related.value.length > 0)

const isFullscreen = ref(false)
const tocOpen = ref(true)

function syncFullscreen(): void {
  isFullscreen.value = Boolean(document.fullscreenElement)
}
async function toggleFullscreen(): Promise<void> {
  if (document.fullscreenElement) await document.exitFullscreen()
  else await document.documentElement.requestFullscreen().catch(() => {})
}
onMounted(() => document.addEventListener('fullscreenchange', syncFullscreen))
onBeforeUnmount(() => document.removeEventListener('fullscreenchange', syncFullscreen))

onMounted(() => {
  tocOpen.value = window.matchMedia('(min-width: 901px)').matches
})

useSeoMeta({
  title: () => post.value.seoTitle || post.value.title,
  description: () => post.value.seoDescription || post.value.summary,
  ogTitle: () => post.value.seoTitle || post.value.title,
  ogDescription: () => post.value.seoDescription || post.value.summary,
  ogImage: () => post.value.coverImageUrl || undefined,
  ogType: 'article',
})
</script>

<template>
  <div class="article-page" :class="{ 'is-solo': !hasSide }">
    <aside class="article-rail" aria-label="阅读工具">
      <button
        type="button"
        class="rail-button"
        :aria-label="isFullscreen ? '退出全屏' : '全屏阅读'"
        :title="isFullscreen ? '退出全屏' : '全屏阅读'"
        @click="toggleFullscreen"
      >
        <UIcon :name="isFullscreen ? 'i-lucide-minimize-2' : 'i-lucide-maximize-2'" />
      </button>
    </aside>

    <article class="article-card">
      <header class="article-header">
        <NuxtLink to="/blog" class="back">← 返回文章</NuxtLink>
        <h1>{{ post.title }}</h1>
        <div class="meta">
          <time :datetime="post.publishedAt">{{ new Date(post.publishedAt).toLocaleDateString('zh-CN') }}</time>
          <span>·</span>
          <span>{{ post.readingMinutes }} 分钟阅读</span>
          <template v-if="post.tags.length">
            <span>·</span>
            <NuxtLink v-for="tag in post.tags" :key="tag.id" :to="`/tags/${tag.slug}`">#{{ tag.name }}</NuxtLink>
          </template>
        </div>
        <p class="summary">{{ post.summary }}</p>
      </header>

      <ArticleImagePreview :html="post.contentHtml" />
    </article>

    <aside class="article-side">
      <section v-if="post.toc.length" class="side-card">
        <details :open="tocOpen" class="side-details">
          <summary class="side-head">
            <span>目录</span>
            <span class="side-head-right">
              <span class="side-count">{{ post.toc.length }}</span>
              <UIcon name="i-lucide-chevron-down" class="side-caret" />
            </span>
          </summary>
          <nav class="toc" aria-label="文章目录">
            <a
              v-for="item in post.toc"
              :key="item.id"
              :href="`#${item.id}`"
              :style="{ paddingLeft: `${(item.level - 2) * 14}px` }"
            >{{ item.text }}</a>
          </nav>
        </details>
      </section>

      <section v-if="related.length" class="side-card">
        <div class="side-head side-head--static">
          <span>相关推荐</span>
        </div>
        <div class="related-list">
          <NuxtLink v-for="item in related" :key="item.id" :to="`/blog/${item.id}`" class="related-item">
            <span class="related-title">{{ item.title }}</span>
            <span class="related-meta">{{ item.readingMinutes }} 分钟阅读 · {{ new Date(item.publishedAt).toLocaleDateString('zh-CN') }}</span>
          </NuxtLink>
        </div>
      </section>
    </aside>
  </div>
</template>

<style>
:root {
  --article-canvas: #f4f5f6;
  --article-card: #fff;
}

html.dark {
  --article-canvas: #0d0d0d;
  --article-card: #171717;
}

body:has(.article-page) {
  background: var(--article-canvas);
}

.article-page {
  display: grid;
  grid-template-columns: 44px minmax(0, 1fr) 292px;
  grid-template-areas: "rail card side";
  gap: 20px 24px;
  align-items: start;
  padding: 12px 0 24px;
}

.article-rail {
  position: sticky;
  top: calc(50vh - 40px);
  display: grid;
  grid-area: rail;
  justify-items: center;
}

.article-page.is-solo {
  grid-template-columns: 44px minmax(0, 880px);
  grid-template-areas: "rail card";
  justify-content: center;
}

.rail-button {
  display: grid;
  width: 38px;
  height: 38px;
  place-items: center;
  border: 1px solid var(--color-border);
  border-radius: 50%;
  background: var(--article-card);
  color: var(--color-text-secondary);
  cursor: pointer;
  transition: color var(--radius-sm, .16s) ease, border-color .16s ease, background .16s ease;
}

.rail-button:hover {
  border-color: var(--color-primary);
  color: var(--color-primary);
}

.rail-button :deep(svg) {
  font-size: 18px;
}

.article-card {
  display: grid;
  grid-area: card;
  min-width: 0;
  gap: 22px;
  padding: 34px 44px 44px;
  border-radius: 12px;
  background: var(--article-card);
}

.article-header {
  display: grid;
  gap: 14px;
}

.article-header h1 {
  margin: 2px 0 0;
  font-size: 32px;
  font-weight: 700;
  letter-spacing: -.02em;
  line-height: 1.32;
}

.back {
  width: fit-content;
  color: var(--color-text-secondary);
  font-size: 12px;
}

.back:hover {
  color: var(--color-primary);
}

.meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  color: var(--color-text-secondary);
  font-size: 12px;
}

.meta a {
  color: var(--color-primary);
}

.summary {
  margin: 0;
  color: var(--color-text-secondary);
  font-size: 15px;
  line-height: 1.75;
}

.article-side {
  position: sticky;
  /* Keep the resting offset (12px page padding + 48px main margin) so the column pins in
     place instead of sliding 40px up the moment it becomes sticky. */
  top: calc(var(--site-header-height) + 60px);
  display: grid;
  grid-area: side;
  gap: 12px;
}

.side-card {
  padding: 14px 16px 16px;
  border-radius: 12px;
  background: var(--article-card);
}

.side-details summary {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  list-style: none;
  cursor: pointer;
}

.side-details summary::-webkit-details-marker {
  display: none;
}

.side-head {
  margin-bottom: 10px;
  color: var(--color-text);
  font-size: 13px;
  font-weight: 700;
}

.side-head--static {
  margin-bottom: 8px;
}

.side-count {
  color: var(--color-text-muted);
  font-size: 11px;
  font-weight: 500;
}

.side-head-right {
  display: inline-flex;
  align-items: center;
  gap: 6px;
}

.side-caret {
  font-size: 14px;
  color: var(--color-text-muted);
  transition: transform .16s ease;
}

.side-details[open] .side-caret {
  transform: rotate(180deg);
}

.toc {
  display: grid;
  max-height: calc(100vh - var(--site-header-height) - 200px);
  gap: 8px;
  padding: 2px 0;
  overflow-y: auto;
  overscroll-behavior: contain;
  scrollbar-width: none;
  font-size: 12px;
}

.toc::-webkit-scrollbar {
  display: none;
}

.toc a {
  color: var(--color-text-secondary);
  line-height: 1.55;
}

.toc a:hover {
  color: var(--color-primary);
}

.related-list {
  display: grid;
  gap: 12px;
}

.related-item {
  display: grid;
  gap: 4px;
}

.related-title {
  color: var(--color-text);
  font-size: 12.5px;
  line-height: 1.5;
}

.related-item:hover .related-title {
  color: var(--color-primary);
}

.related-meta {
  color: var(--color-text-muted);
  font-size: 11px;
}

.markdown-body {
  min-width: 0;
  font-family: system-ui,"Microsoft YaHei UI","Microsoft YaHei",sans-serif;
  font-size: 15px;
  line-height: 1.85;
  overflow-wrap: anywhere;
}

.markdown-body h1,.markdown-body h2,.markdown-body h3,.markdown-body h4 {
  scroll-margin-top: calc(var(--site-header-height) + 24px);
  margin: 1.8em 0 .7em;
  line-height: 1.35;
  letter-spacing: -.02em;
}

.markdown-body h2 {
  padding-bottom: .35em;
  border-bottom: 1px solid var(--color-border);
  font-size: 23px;
}

.markdown-body h3 {
  font-size: 19px;
}

.markdown-body p {
  margin: 1em 0;
}

.markdown-body a {
  color: var(--color-primary);
  text-decoration: underline;
  text-underline-offset: 3px;
}

.markdown-body img {
  max-width: 100%;
  height: auto;
  border-radius: var(--radius-sm);
  vertical-align: middle;
}

.markdown-body p>img:only-child {
  display: block;
  margin: 24px auto;
}

.markdown-body picture {
  display: block;
  max-width: 100%;
  margin: 24px auto;
  text-align: center;
}

.markdown-body picture img {
  display: inline-block;
}

.markdown-body blockquote {
  margin: 20px 0;
  padding: 2px 18px;
  border-left: 3px solid var(--color-primary);
  color: var(--color-text-secondary);
}

.markdown-body code {
  padding: .18em .38em;
  border-radius: 4px;
  background: var(--color-background-secondary);
  font-family: ui-monospace,SFMono-Regular,Consolas,monospace;
  font-size: .88em;
}

.markdown-body pre {
  margin: 22px 0;
  padding: 18px;
  border-radius: var(--radius-md);
  overflow: auto;
}

.markdown-body pre code {
  padding: 0;
  background: none;
}

.markdown-body table {
  display: block;
  width: 100%;
  border-collapse: collapse;
  overflow-x: auto;
}

.markdown-body th,.markdown-body td {
  padding: 9px 12px;
  border: 1px solid var(--color-border);
  text-align: left;
}

.markdown-body hr {
  margin: 32px 0;
  border: 0;
  border-top: 1px solid var(--color-border);
}

.markdown-body li {
  margin: .35em 0;
}

@media (max-width: 1180px) {
  .article-page {
    grid-template-columns: 44px minmax(0, 1fr);
    grid-template-areas: "rail card" "rail side";
  }

  .article-rail {
    position: static;
  }

  .article-side {
    position: static;
    grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
  }
}

@media (max-width: 900px) {
  .article-page {
    grid-template-columns: minmax(0, 1fr);
    grid-template-areas: "side" "card";
    gap: 12px;
    padding: 8px 0 20px;
  }

  .article-rail {
    display: none;
  }

  .article-card {
    gap: 16px;
    padding: 22px 18px 28px;
    border-radius: 10px;
  }

  .article-header h1 {
    font-size: 24px;
  }

  .toc {
    max-height: none;
  }
}
</style>
