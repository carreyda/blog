<script setup lang="ts">
type Bookmark = { id: number; name: string; description: string; iconUrl: string | null; url: string }
type Category = { id: number; name: string; bookmarks: Bookmark[]; children: Category[] }
type FlatCategory = { id: number; name: string; depth: number; count: number; hasChildren: boolean }
type BookmarkResponse = { data: Category[] }

const { data: response, pending } = await useFetch<BookmarkResponse>('/api/bookmarks')
const categories = computed(() => response.value?.data || [])
const search = ref('')
const total = computed(() => categories.value.reduce((sum, category) => sum + categoryCount(category), 0))
const filteredCategories = computed(() => {
  const keyword = search.value.trim().toLocaleLowerCase()
  if (!keyword) return categories.value
  return categories.value
    .map(category => filterCategory(category, keyword))
    .filter((category): category is Category => category !== null)
})
const filteredTotal = computed(() => filteredCategories.value.reduce((sum, category) => sum + categoryCount(category), 0))

/* Collapsed branches only affect the sidebar index; the sections below always render. */
const collapsedIds = ref<number[]>([])
const collapsedSet = computed(() => new Set(collapsedIds.value))
const isCollapsed = (id: number) => collapsedSet.value.has(id)
const branchIds = computed(() => flattenCategories(categories.value).filter(item => item.hasChildren).map(item => item.id))
const allCollapsed = computed(() => branchIds.value.length > 0 && branchIds.value.every(id => collapsedSet.value.has(id)))

/* A search hit should never hide behind a collapsed branch, so filtering expands everything. */
const visibleCategories = computed(() => {
  if (search.value.trim()) return flattenCategories(categories.value)
  return flattenVisible(categories.value)
})

function toggleCategory(id: number) {
  collapsedIds.value = isCollapsed(id)
    ? collapsedIds.value.filter(item => item !== id)
    : [...collapsedIds.value, id]
}

function toggleAllCategories() {
  collapsedIds.value = allCollapsed.value ? [] : [...branchIds.value]
}

function categoryCount(category: Category): number {
  return category.bookmarks.length + category.children.reduce((sum, child) => sum + categoryCount(child), 0)
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

function toFlatCategory(node: Category, depth: number): FlatCategory {
  return { id: node.id, name: node.name, depth, count: categoryCount(node), hasChildren: node.children.length > 0 }
}

function flattenCategories(nodes: Category[], depth = 0): FlatCategory[] {
  return nodes.flatMap(node => [toFlatCategory(node, depth), ...flattenCategories(node.children, depth + 1)])
}

function flattenVisible(nodes: Category[], depth = 0): FlatCategory[] {
  return nodes.flatMap(node => [
    toFlatCategory(node, depth),
    ...(collapsedSet.value.has(node.id) ? [] : flattenVisible(node.children, depth + 1)),
  ])
}

function jumpTo(target: string) {
  if (search.value) search.value = ''
  nextTick(() => document.getElementById(target)?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
}

useSeoMeta({ title: '收藏', description: '按分类整理的实用网站、开发工具与学习资源。' })
</script>

<template>
  <section class="bookmarks-page">
    <aside class="bookmarks-sidebar">
      <p class="eyebrow">BOOKMARKS</p>
      <h1>收藏</h1>
      <p class="lead">整理值得反复访问的工具、资源与灵感来源。</p>

      <label class="bookmark-search">
        <UIcon name="i-lucide-search" />
        <input v-model="search" type="search" placeholder="搜索收藏名称、描述或网址" aria-label="搜索收藏">
        <button v-if="search" type="button" aria-label="清除搜索" @click="search = ''">
          <UIcon name="i-lucide-x" />
        </button>
      </label>
      <p class="bookmark-count">
        <template v-if="search">找到 <strong>{{ filteredTotal }}</strong> 个站点</template>
        <template v-else>共 <strong>{{ total }}</strong> 个站点</template>
      </p>

      <nav class="category-tree" aria-label="收藏分类">
        <div class="tree-head">
          <p class="filter-label">分类</p>
          <button v-if="branchIds.length" type="button" class="tree-all" @click="toggleAllCategories">
            {{ allCollapsed ? '展开全部' : '收起全部' }}
          </button>
        </div>
        <template v-for="category in visibleCategories" :key="category.id">
          <button
            v-if="category.hasChildren"
            type="button"
            class="tree-link has-children"
            :class="{ 'is-root': category.depth === 0 }"
            :style="{ '--depth': category.depth }"
            :aria-expanded="!isCollapsed(category.id)"
            @click="toggleCategory(category.id)"
          >
            <UIcon
              name="i-lucide-chevron-right"
              class="tree-chevron"
              :class="{ 'is-open': !isCollapsed(category.id) }"
            />
            <span class="tree-name">{{ category.name }}</span>
            <span class="tree-count">{{ category.count }}</span>
          </button>
          <a
            v-else
            :href="`#bookmark-category-${category.id}`"
            class="tree-link"
            :class="{ 'is-root': category.depth === 0 }"
            :style="{ '--depth': category.depth }"
            @click.prevent="jumpTo(`bookmark-category-${category.id}`)"
          >
            <span class="tree-dot" aria-hidden="true" />
            <span class="tree-name">{{ category.name }}</span>
            <span class="tree-count">{{ category.count }}</span>
          </a>
        </template>
      </nav>
    </aside>

    <div class="bookmarks-content">
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
      <div v-else class="category-sections">
        <BookmarkCategoryBranch
          v-for="category in filteredCategories"
          :key="category.id"
          :category="category"
        />
      </div>
    </div>
  </section>
</template>

<style scoped>
.bookmarks-page {
  display: grid;
  grid-template-columns: 252px minmax(0, 1fr);
  align-items: start;
  gap: 60px;
}

.bookmarks-sidebar {
  position: sticky;
  /* Same resting offset as the blog list, so it pins instead of sliding up on scroll. */
  top: calc(var(--site-header-height) + 48px);
  align-self: start;
  max-height: calc(100vh - var(--site-header-height) - 72px);
  padding-right: 4px;
  overflow-y: auto;
  overscroll-behavior: contain;
}

.bookmarks-sidebar h1 {
  margin: 0 0 12px;
  font-size: 34px;
  line-height: 1.15;
  letter-spacing: -.05em;
}

.bookmarks-sidebar .lead {
  max-width: 240px;
  margin: 0 0 28px;
  font-size: 13px;
  line-height: 1.8;
}

.bookmark-search {
  display: flex;
  min-height: 42px;
  align-items: center;
  gap: 8px;
  padding: 4px 5px 4px 12px;
  border: 1px solid var(--color-border);
  border-radius: 10px;
  background: var(--color-background-secondary);
  color: var(--color-text-muted);
  transition: border-color .16s ease, box-shadow .16s ease, background .16s ease;
}

.bookmark-search:focus-within {
  border-color: color-mix(in srgb, var(--color-primary) 65%, var(--color-border));
  background: var(--color-background);
  box-shadow: 0 0 0 3px color-mix(in srgb, var(--color-primary) 10%, transparent);
}

.bookmark-search > svg {
  width: 15px;
  height: 15px;
  flex: 0 0 auto;
}

.bookmark-search input {
  min-width: 0;
  flex: 1;
  padding: 8px 0;
  border: 0;
  outline: 0;
  background: transparent;
  color: var(--color-text);
  font: inherit;
  font-size: 11.5px;
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
  place-items: center;
  border: 0;
  border-radius: 6px;
  color: var(--color-text-secondary);
  background: transparent;
  cursor: pointer;
}

.bookmark-search button:hover {
  background: var(--color-border);
  color: var(--color-text);
}

.bookmark-search button svg {
  width: 14px;
  height: 14px;
}

.bookmark-count {
  margin: 10px 2px 0;
  color: var(--color-text-secondary);
  font-size: 11px;
}

.bookmark-count strong {
  color: var(--color-text);
  font-weight: 650;
}

.category-tree {
  display: grid;
  gap: 2px;
  margin-top: 28px;
  padding-top: 20px;
  border-top: 1px solid var(--color-border);
}

.tree-head {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin: 0 0 6px;
}

.filter-label {
  margin: 0;
  color: var(--color-text-muted);
  font-size: 10px;
  letter-spacing: .12em;
  text-transform: uppercase;
}

.tree-all {
  padding: 2px 4px;
  border: 0;
  border-radius: 4px;
  background: transparent;
  color: var(--color-text-muted);
  font: inherit;
  font-size: 10px;
  cursor: pointer;
  transition: color .15s ease, background .15s ease;
}

.tree-all:hover {
  color: var(--color-primary);
  background: var(--color-background-secondary);
}

.tree-link {
  display: grid;
  grid-template-columns: 14px minmax(0, 1fr) auto;
  min-height: 30px;
  align-items: center;
  gap: 6px;
  padding: 0 8px 0 calc(4px + var(--depth) * 14px);
  border: 0;
  border-radius: 6px;
  background: transparent;
  color: var(--color-text-secondary);
  font: inherit;
  font-size: 11px;
  text-align: left;
  text-decoration: none;
  cursor: pointer;
  transition: color .15s ease, background .15s ease;
}

.tree-link.is-root {
  color: var(--color-text);
  font-size: 12px;
  font-weight: 600;
}

.tree-chevron {
  width: 14px;
  height: 14px;
  color: var(--color-text-muted);
  transition: transform .18s ease, color .15s ease;
}

.tree-chevron.is-open {
  transform: rotate(90deg);
}

.tree-dot {
  width: 4px;
  height: 4px;
  justify-self: center;
  border-radius: 50%;
  background: var(--color-border);
}

.tree-name {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.tree-count {
  color: var(--color-text-muted);
  font-size: 10px;
  font-variant-numeric: tabular-nums;
}

.tree-link:hover {
  color: var(--color-primary);
  background: var(--color-background-secondary);
}

.tree-link:hover .tree-chevron {
  color: var(--color-primary);
}

.tree-link:hover .tree-dot {
  background: color-mix(in srgb, var(--color-primary) 55%, transparent);
}

.bookmarks-content {
  min-width: 0;
}

.category-sections {
  display: grid;
  gap: 44px;
}

.empty-state {
  display: grid;
  min-height: 300px;
  place-items: center;
  align-content: center;
  gap: 9px;
  color: var(--color-text-secondary);
  text-align: center;
}

.empty-state > svg {
  width: 28px;
  height: 28px;
  margin-bottom: 4px;
  color: var(--color-text-muted);
}

.empty-state strong {
  color: var(--color-text);
  font-size: 13px;
}

.empty-state p {
  margin: 0;
  font-size: 11px;
}

@media (max-width: 900px) {
  .bookmarks-page {
    grid-template-columns: 1fr;
    gap: 30px;
  }

  .bookmarks-sidebar {
    position: static;
    max-height: none;
    padding-right: 0;
    overflow: visible;
  }

  .bookmarks-sidebar h1 {
    font-size: 30px;
  }

  .bookmarks-sidebar .lead {
    max-width: 560px;
    margin-bottom: 22px;
  }

  .category-tree {
    display: flex;
    flex-wrap: wrap;
    gap: 6px;
    margin-top: 20px;
    padding-top: 16px;
  }

  .tree-head {
    width: 100%;
  }

  .filter-label {
    width: auto;
    margin-bottom: 2px;
  }

  .tree-all {
    white-space: nowrap;
  }

  .tree-link {
    min-height: 28px;
    padding: 0 10px;
    border: 1px solid var(--color-border);
  }

  .tree-dot {
    display: none;
  }

  .tree-link {
    display: inline-flex;
    align-items: center;
    gap: 6px;
    white-space: nowrap;
  }
}

@media (max-width: 620px) {
  .category-sections {
    gap: 36px;
  }
}
</style>
