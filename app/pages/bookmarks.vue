<script setup lang="ts">
type Bookmark = { id: number; name: string; description: string; iconUrl: string | null; url: string }
type Category = { id: number; name: string; bookmarks: Bookmark[]; children: Category[] }
type BookmarkResponse = { data: Category[] }

type BookmarkSectionItem = {
  id: number
  name: string
  path: string
  bookmarks: Bookmark[]
}

type BookmarkGroup = {
  id: number
  name: string
  count: number
  bookmarks: Bookmark[]
  sections: BookmarkSectionItem[]
}

const { data: response, pending } = await useFetch<BookmarkResponse>('/api/bookmarks')
const categories = computed(() => response.value?.data || [])
const search = ref('')

const filteredCategories = computed(() => {
  const keyword = search.value.trim().toLocaleLowerCase()
  if (!keyword) return categories.value
  return categories.value
    .map(category => filterCategory(category, keyword))
    .filter((category): category is Category => category !== null)
})

const total = computed(() => categories.value.reduce((sum, category) => sum + categoryCount(category), 0))
const filteredTotal = computed(() => filteredCategories.value.reduce((sum, category) => sum + categoryCount(category), 0))

/*
 * One root category = one page group. Categories that only pass through (no bookmarks of
 * their own) are folded into the breadcrumb of their descendants instead of getting a header,
 * so the page stays two levels deep no matter how deep the category tree grows.
 */
const groups = computed<BookmarkGroup[]>(() => filteredCategories.value.map((root) => {
  const sections = root.children.flatMap(child => flattenSections(child, []))
  return {
    id: root.id,
    name: root.name,
    count: categoryCount(root),
    bookmarks: root.bookmarks,
    sections,
  }
}))

function categoryCount(category: Category): number {
  return category.bookmarks.length + category.children.reduce((sum, child) => sum + categoryCount(child), 0)
}

function flattenSections(category: Category, trail: string[]): BookmarkSectionItem[] {
  const sections: BookmarkSectionItem[] = []
  if (category.bookmarks.length) {
    sections.push({
      id: category.id,
      name: category.name,
      path: trail.join(' / '),
      bookmarks: category.bookmarks,
    })
  }
  for (const child of category.children) {
    sections.push(...flattenSections(child, [...trail, category.name]))
  }
  return sections
}

function filterCategory(category: Category, keyword: string): Category | null {
  const bookmarks = category.bookmarks.filter(bookmark => [bookmark.name, bookmark.description, bookmark.url]
    .some(value => value.toLocaleLowerCase().includes(keyword)))
  const children = category.children
    .map(child => filterCategory(child, keyword))
    .filter((child): child is Category => child !== null)

  if (!bookmarks.length && !children.length) return null
  return { ...category, bookmarks, children }
}

useSeoMeta({ title: '收藏', description: '按分类整理的实用网站、开发工具与学习资源。' })
</script>

<template>
  <section class="bookmarks-page">
    <header class="page-head">
      <div class="head-copy">
        <h1>收藏</h1>
        <p class="lead">整理值得反复访问的工具、资源与灵感来源。</p>
        <p class="page-meta">
          <template v-if="search">找到 <strong>{{ filteredTotal }}</strong> 个站点</template>
          <template v-else>共 <strong>{{ total }}</strong> 个站点</template>
        </p>
      </div>
      <label class="bookmark-search">
        <UIcon name="i-lucide-search" />
        <input v-model="search" type="search" placeholder="搜索收藏名称、描述或网址" aria-label="搜索收藏">
        <button v-if="search" type="button" aria-label="清除搜索" @click="search = ''">
          <UIcon name="i-lucide-x" />
        </button>
      </label>
    </header>

    <div v-if="pending" class="empty-state">正在加载收藏…</div>
    <div v-else-if="!categories.length" class="empty-state">
      <UIcon name="i-lucide-bookmark" />
      <strong>暂时还没有公开收藏</strong>
      <p>以后会把常用的网站整理在这里。</p>
    </div>
    <div v-else-if="!filteredCategories.length" class="empty-state">
      <UIcon name="i-lucide-search-x" />
      <strong>没有找到匹配的网站</strong>
      <p>换一个关键词试试看。</p>
    </div>
    <div v-else class="bookmark-groups">
      <section v-for="group in groups" :key="group.id" class="bookmark-group">
        <BookmarkSection
          variant="group"
          :title="group.name"
          :count="group.count"
          :bookmarks="group.bookmarks"
        />
        <BookmarkSection
          v-for="section in group.sections"
          :key="section.id"
          :title="section.name"
          :path="section.path"
          :bookmarks="section.bookmarks"
        />
      </section>
    </div>
  </section>
</template>

<style scoped>
.bookmarks-page {
  font-family: system-ui, -apple-system, 'Segoe UI', 'Microsoft YaHei UI', 'PingFang SC', sans-serif;
}

.page-head {
  display: flex;
  align-items: flex-end;
  justify-content: space-between;
  gap: 32px;
  margin-bottom: 46px;
}

.page-head h1 {
  margin: 0 0 10px;
  font-size: 32px;
  line-height: 1.15;
  letter-spacing: -.05em;
}

.page-head .lead {
  margin: 0;
  color: var(--color-text-secondary);
  font-size: 13px;
  line-height: 1.8;
}

.page-meta {
  margin: 10px 0 0;
  color: var(--color-text-muted);
  font-family: ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, monospace;
  font-size: 11px;
  letter-spacing: .01em;
}

.page-meta strong {
  color: var(--color-text);
  font-weight: 650;
}

.bookmark-search {
  display: flex;
  width: 300px;
  min-height: 40px;
  flex: 0 0 auto;
  align-items: center;
  gap: 8px;
  padding: 4px 6px 4px 12px;
  border: 1px solid var(--color-border);
  border-radius: 9px;
  background: var(--color-background-secondary);
  color: var(--color-text-muted);
  transition: border-color .16s ease, box-shadow .16s ease, background .16s ease;
}

.bookmark-search:focus-within {
  border-color: color-mix(in srgb, var(--color-primary) 65%, var(--color-border));
  background: var(--color-background);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-primary) 10%, transparent);
}

.bookmark-search svg {
  width: 15px;
  height: 15px;
  flex: 0 0 auto;
}

.bookmark-search input {
  width: 100%;
  min-width: 0;
  padding: 0;
  border: 0;
  outline: 0;
  background: transparent;
  color: var(--color-text);
  font: inherit;
  font-size: 12px;
}

.bookmark-search input::placeholder {
  color: var(--color-text-muted);
}

.bookmark-search input::-webkit-search-cancel-button {
  display: none;
}

.bookmark-search button {
  display: grid;
  width: 26px;
  height: 26px;
  flex: 0 0 auto;
  padding: 0;
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: var(--color-text-muted);
  cursor: pointer;
  place-items: center;
}

.bookmark-search button:hover {
  background: var(--color-background);
  color: var(--color-text);
}

.bookmark-search button svg {
  width: 13px;
  height: 13px;
}

.bookmark-groups {
  display: flex;
  flex-direction: column;
  gap: 52px;
}

.bookmark-group {
  min-width: 0;
}

.empty-state {
  display: grid;
  justify-items: center;
  gap: 10px;
  padding: 72px 24px;
  border: 1px dashed var(--color-border);
  border-radius: 14px;
  color: var(--color-text-secondary);
  text-align: center;
}

.empty-state svg {
  width: 26px;
  height: 26px;
  color: var(--color-text-muted);
}

.empty-state strong {
  color: var(--color-text);
  font-size: 14px;
  font-weight: 600;
}

.empty-state p {
  margin: 0;
  font-size: 12px;
}

@media (max-width: 720px) {
  .page-head {
    align-items: stretch;
    flex-direction: column;
    gap: 22px;
    margin-bottom: 34px;
  }

  .page-head h1 {
    font-size: 28px;
  }

  .bookmark-search {
    width: 100%;
  }

  .bookmark-groups {
    gap: 40px;
  }
}
</style>
