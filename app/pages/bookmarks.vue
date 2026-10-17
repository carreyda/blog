<script setup lang="ts">
type Bookmark = { id: number; name: string; description: string; iconUrl: string | null; url: string }
type ChildCategory = { id: number; name: string; bookmarks: Bookmark[] }
type RootCategory = { id: number; name: string; children: ChildCategory[] }
type BookmarkResponse = { data: RootCategory[] }

const { data: response, pending } = await useFetch<BookmarkResponse>('/api/bookmarks')
const categories = computed(() => response.value?.data || [])
const search = ref('')
const brokenIcons = ref(new Set<number>())
const total = computed(() => categories.value.reduce((sum, parent) => sum + categoryCount(parent), 0))
const filteredCategories = computed(() => {
  const keyword = search.value.trim().toLocaleLowerCase()
  if (!keyword) return categories.value
  return categories.value.map(parent => ({
    ...parent,
    children: parent.children.map(child => ({
      ...child,
      bookmarks: child.bookmarks.filter(bookmark => [bookmark.name, bookmark.description, bookmark.url]
        .some(value => value.toLocaleLowerCase().includes(keyword))),
    })).filter(child => child.bookmarks.length),
  })).filter(parent => parent.children.length)
})
const filteredTotal = computed(() => filteredCategories.value.reduce((sum, parent) => sum + categoryCount(parent), 0))

function categoryCount(category: RootCategory) {
  return category.children.reduce((sum, child) => sum + child.bookmarks.length, 0)
}

function jumpTo(target: string) {
  if (search.value) search.value = ''
  nextTick(() => document.getElementById(target)?.scrollIntoView({ behavior: 'smooth', block: 'start' }))
}

function markIconBroken(id: number) {
  brokenIcons.value = new Set([...brokenIcons.value, id])
}

function hostname(url: string) {
  try { return new URL(url).hostname.replace(/^www\./, '') } catch { return url }
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
        <p class="filter-label">分类</p>
        <div v-for="parent in categories" :key="parent.id" class="tree-group">
          <a
            :href="`#bookmark-category-${parent.id}`"
            class="tree-parent"
            @click.prevent="jumpTo(`bookmark-category-${parent.id}`)"
          >
            <span>{{ parent.name }}</span>
            <span>{{ categoryCount(parent) }}</span>
          </a>
          <a
            v-for="child in parent.children"
            :key="child.id"
            :href="`#bookmark-child-${child.id}`"
            class="tree-child"
            @click.prevent="jumpTo(`bookmark-child-${child.id}`)"
          >
            <span>{{ child.name }}</span>
            <span>{{ child.bookmarks.length }}</span>
          </a>
        </div>
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
        <section
          v-for="parent in filteredCategories"
          :id="`bookmark-category-${parent.id}`"
          :key="parent.id"
          class="category-section"
        >
          <header class="category-heading">
            <span><UIcon name="i-lucide-folder-open" /></span>
            <div>
              <h2>{{ parent.name }}</h2>
              <p>{{ categoryCount(parent) }} 个站点</p>
            </div>
          </header>

          <section
            v-for="child in parent.children"
            :id="`bookmark-child-${child.id}`"
            :key="child.id"
            class="child-section"
          >
            <h3>{{ child.name }} <span>{{ child.bookmarks.length }}</span></h3>
            <div class="bookmark-grid">
              <a
                v-for="bookmark in child.bookmarks"
                :key="bookmark.id"
                class="bookmark-card"
                :href="bookmark.url"
                target="_blank"
                rel="noopener noreferrer"
              >
                <span class="site-icon">
                  <img
                    v-if="bookmark.iconUrl && !brokenIcons.has(bookmark.id)"
                    :src="bookmark.iconUrl"
                    alt=""
                    loading="lazy"
                    @error="markIconBroken(bookmark.id)"
                  >
                  <UIcon v-else name="i-lucide-globe-2" />
                </span>
                <span class="site-content">
                  <strong>{{ bookmark.name }}</strong>
                  <p>{{ bookmark.description }}</p>
                  <small>{{ hostname(bookmark.url) }}</small>
                </span>
                <UIcon class="external-icon" name="i-lucide-arrow-up-right" />
              </a>
            </div>
          </section>
        </section>
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
  top: calc(var(--site-header-height) + 26px);
  align-self: start;
  max-height: calc(100vh - var(--site-header-height) - 52px);
  padding-right: 4px;
  overflow-y: auto;
  overscroll-behavior: contain;
  scrollbar-width: thin;
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

.filter-label {
  margin: 0 0 8px;
  color: var(--color-text-muted);
  font-size: 10px;
  letter-spacing: .12em;
  text-transform: uppercase;
}

.tree-group {
  display: grid;
  gap: 1px;
}

.tree-group + .tree-group {
  margin-top: 10px;
}

.tree-parent,
.tree-child {
  display: flex;
  min-height: 30px;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 0 8px;
  border-radius: 6px;
  color: var(--color-text-secondary);
  transition: color .15s ease, background .15s ease;
}

.tree-parent {
  color: var(--color-text);
  font-size: 12px;
  font-weight: 600;
}

.tree-child {
  padding-left: 20px;
  font-size: 11px;
}

.tree-parent span:last-child,
.tree-child span:last-child {
  color: var(--color-text-muted);
  font-size: 10px;
  font-variant-numeric: tabular-nums;
}

.tree-parent:hover,
.tree-child:hover {
  color: var(--color-primary);
  background: var(--color-background-secondary);
}

.bookmarks-content {
  min-width: 0;
}

.category-sections {
  display: grid;
  gap: 44px;
}

.category-section {
  scroll-margin-top: calc(var(--site-header-height) + 26px);
}

.category-heading {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 20px;
  padding-bottom: 14px;
  border-bottom: 1px solid var(--color-border);
}

.category-heading > span {
  display: grid;
  width: 36px;
  height: 36px;
  place-items: center;
  border-radius: 10px;
  color: var(--color-primary);
  background: color-mix(in srgb, var(--color-primary) 11%, transparent);
}

.category-heading svg {
  width: 17px;
}

.category-heading h2 {
  margin: 0;
  font-family: system-ui, "Microsoft YaHei UI", sans-serif;
  font-size: 20px;
  letter-spacing: -.025em;
}

.category-heading p {
  margin: 4px 0 0;
  color: var(--color-text-muted);
  font-size: 10px;
}

.child-section {
  scroll-margin-top: calc(var(--site-header-height) + 30px);
}

.child-section + .child-section {
  margin-top: 26px;
}

.child-section h3 {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: 0 0 12px;
  color: var(--color-text-secondary);
  font-size: 11.5px;
  font-weight: 650;
  letter-spacing: .03em;
}

.child-section h3 span {
  color: var(--color-text-muted);
  font-size: 10px;
  font-weight: 450;
}

.bookmark-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 14px;
}

.bookmark-card {
  position: relative;
  display: grid;
  min-height: 126px;
  grid-template-columns: 42px minmax(0, 1fr);
  align-items: start;
  gap: 13px;
  padding: 17px;
  border: 1px solid var(--color-border);
  border-radius: 12px;
  background: var(--color-background);
  transition: border-color .18s ease, transform .18s ease, box-shadow .18s ease;
}

.bookmark-card:hover {
  border-color: color-mix(in srgb, var(--color-primary) 55%, var(--color-border));
  transform: translateY(-2px);
  box-shadow: 0 12px 30px rgba(0, 0, 0, .07);
}

.site-icon {
  display: grid;
  width: 42px;
  height: 42px;
  overflow: hidden;
  place-items: center;
  border: 1px solid var(--color-border);
  border-radius: 11px;
  color: var(--color-primary);
  background: var(--color-background-secondary);
}

.site-icon img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.site-icon svg {
  width: 18px;
  height: 18px;
}

.site-content {
  display: block;
  min-width: 0;
}

.site-content strong {
  display: block;
  padding-right: 22px;
  overflow: hidden;
  font-family: system-ui, "Microsoft YaHei UI", sans-serif;
  font-size: 14.5px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.site-content p {
  display: -webkit-box;
  margin: 7px 0;
  overflow: hidden;
  color: var(--color-text-secondary);
  font-size: 11.5px;
  line-height: 1.6;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.site-content small {
  display: block;
  overflow: hidden;
  color: var(--color-text-muted);
  font-size: 10px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.external-icon {
  position: absolute;
  top: 17px;
  right: 16px;
  width: 15px;
  height: 15px;
  color: var(--color-text-muted);
  transition: color .18s ease, transform .18s ease;
}

.bookmark-card:hover .external-icon {
  color: var(--color-primary);
  transform: translate(2px, -2px);
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

  .filter-label {
    width: 100%;
    margin-bottom: 2px;
  }

  .tree-group {
    display: contents;
  }

  .tree-group + .tree-group {
    margin-top: 0;
  }

  .tree-parent,
  .tree-child {
    min-height: 28px;
    padding: 0 10px;
    border: 1px solid var(--color-border);
  }

  .tree-child {
    padding-left: 10px;
  }
}

@media (max-width: 620px) {
  .bookmark-grid {
    grid-template-columns: 1fr;
  }

  .bookmark-card {
    min-height: 118px;
  }

  .category-sections {
    gap: 36px;
  }
}
</style>
