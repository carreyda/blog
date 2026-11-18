<script setup lang="ts">
type Bookmark = {
  id: number
  name: string
  description: string
  iconUrl: string | null
  url: string
  sort: number
}
type Category = { id: number; name: string; bookmarks: Bookmark[]; children: Category[] }
type BookmarkResponse = { data: Category[] }
type AdminSession = {
  user: { id: number; username: string; role: string }
  csrfToken: string
}

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

const adminSession = ref<AdminSession | null>(null)
const editMode = ref(false)
const savingOrder = ref(false)
const sortMessage = ref('')
let sortMessageTimer: ReturnType<typeof setTimeout> | null = null

const filteredCategories = computed(() => {
  const keyword = search.value.trim().toLocaleLowerCase()
  if (!keyword) return categories.value
  return categories.value
    .map(category => filterCategory(category, keyword))
    .filter((category): category is Category => category !== null)
})

const total = computed(() => categories.value.reduce((sum, category) => sum + categoryCount(category), 0))
const filteredTotal = computed(() => filteredCategories.value.reduce((sum, category) => sum + categoryCount(category), 0))
const canEnterEditMode = computed(() => !search.value.trim())

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

onMounted(async () => {
  try {
    const session = await $fetch<{ data: AdminSession }>('/api/auth/session')
    adminSession.value = session.data
  } catch {
    adminSession.value = null
  }
})

onBeforeUnmount(() => {
  if (sortMessageTimer) clearTimeout(sortMessageTimer)
})

watch(search, (value) => {
  if (value.trim()) editMode.value = false
})

function toggleEditMode() {
  if (!adminSession.value || savingOrder.value) return
  if (!editMode.value && !canEnterEditMode.value) return
  editMode.value = !editMode.value
  if (!editMode.value) sortMessage.value = ''
}

function flashSortMessage(message: string) {
  sortMessage.value = message
  if (sortMessageTimer) clearTimeout(sortMessageTimer)
  sortMessageTimer = setTimeout(() => {
    sortMessage.value = ''
  }, 2400)
}

function findCategory(items: Category[], id: number): Category | null {
  for (const item of items) {
    if (item.id === id) return item
    const found = findCategory(item.children, id)
    if (found) return found
  }
  return null
}

/*
 * Reorder one category's bookmarks and persist through the existing admin endpoint.
 * Only the admin session rendered by onMounted can trigger this; visitors never see
 * the sort toggle, and the server rejects the PATCH without a session anyway.
 */
async function handleReorder(categoryId: number, orderedIds: number[]) {
  const session = adminSession.value
  if (!session || savingOrder.value || search.value.trim()) return
  const category = findCategory(categories.value, categoryId)
  if (!category) return

  const bookmarksById = new Map(category.bookmarks.map(bookmark => [bookmark.id, bookmark]))
  const ordered = orderedIds
    .map(id => bookmarksById.get(id))
    .filter((bookmark): bookmark is Bookmark => Boolean(bookmark))
  if (ordered.length !== orderedIds.length) return

  // Same slot policy as the admin page: reuse the current sort slots when they are
  // unique, otherwise renumber this category's visible range.
  const slots = category.bookmarks.map(bookmark => bookmark.sort).sort((left, right) => left - right)
  const uniqueSlots = slots.every((value, index) => index === 0 || value !== slots[index - 1])
  const slotValues = uniqueSlots ? slots : slots.map((value, index) => value + index)
  const entries = ordered.map((bookmark, index) => ({ id: bookmark.id, sort: slotValues[index] ?? index }))
  const sortById = new Map(entries.map(entry => [entry.id, entry.sort]))
  const previous = category.bookmarks

  category.bookmarks = ordered.map(bookmark => ({
    ...bookmark,
    sort: sortById.get(bookmark.id) ?? bookmark.sort,
  }))

  savingOrder.value = true
  sortMessage.value = '保存中…'
  try {
    await $fetch('/api/admin/bookmarks/reorder', {
      method: 'PATCH',
      body: { entries },
      headers: { 'X-CSRF-Token': session.csrfToken },
    })
    flashSortMessage('排序已保存')
  } catch (error) {
    category.bookmarks = previous
    const status = (error as { statusCode?: number }).statusCode ?? (error as { status?: number }).status
    if (status === 401) {
      adminSession.value = null
      editMode.value = false
      flashSortMessage('登录状态已失效，请重新登录')
    } else {
      flashSortMessage('保存失败，请重试')
    }
  } finally {
    savingOrder.value = false
  }
}

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
      <div class="head-actions">
        <button
          v-if="adminSession"
          type="button"
          class="sort-toggle"
          :class="{ 'is-active': editMode }"
          :disabled="savingOrder || (!editMode && !canEnterEditMode)"
          :title="editMode ? '退出排序' : '登录管理员后可拖拽排序'"
          @click="toggleEditMode"
        >
          <UIcon :name="editMode ? 'i-lucide-check' : 'i-lucide-grip-vertical'" />
          <span>{{ editMode ? '完成' : '排序' }}</span>
        </button>
        <label class="bookmark-search">
          <UIcon name="i-lucide-search" />
          <input v-model="search" type="search" placeholder="搜索收藏名称、描述或网址" aria-label="搜索收藏">
          <button v-if="search" type="button" aria-label="清除搜索" @click="search = ''">
            <UIcon name="i-lucide-x" />
          </button>
        </label>
      </div>
    </header>

    <p v-if="editMode || sortMessage" class="sort-hint">
      <template v-if="editMode">
        <UIcon name="i-lucide-hand" />
        <span>拖动卡片上的手柄调整顺序，仅在本分类内生效</span>
      </template>
      <span v-if="sortMessage" class="sort-message">{{ sortMessage }}</span>
    </p>

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
          :category-id="group.id"
          :title="group.name"
          :count="group.count"
          :bookmarks="group.bookmarks"
          :editable="editMode"
          :sorting="savingOrder"
          @reorder="handleReorder"
        />
        <BookmarkSection
          v-for="section in group.sections"
          :key="section.id"
          :category-id="section.id"
          :title="section.name"
          :path="section.path"
          :bookmarks="section.bookmarks"
          :editable="editMode"
          :sorting="savingOrder"
          @reorder="handleReorder"
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

.head-actions {
  display: flex;
  flex: 0 0 auto;
  align-items: center;
  gap: 10px;
}

.sort-toggle {
  display: inline-flex;
  min-height: 40px;
  flex: 0 0 auto;
  align-items: center;
  gap: 6px;
  padding: 0 12px;
  border: 1px solid var(--color-border);
  border-radius: 9px;
  background: var(--color-background-secondary);
  color: var(--color-text-secondary);
  cursor: pointer;
  font: inherit;
  font-size: 12px;
  transition: border-color .16s ease, color .16s ease, background-color .16s ease;
}

.sort-toggle:hover:not(:disabled) {
  border-color: color-mix(in srgb, var(--color-primary) 40%, var(--color-border));
  color: var(--color-text);
}

.sort-toggle.is-active {
  border-color: color-mix(in srgb, var(--color-primary) 55%, var(--color-border));
  background: color-mix(in srgb, var(--color-primary) 10%, var(--color-background-secondary));
  color: var(--color-primary);
}

.sort-toggle:disabled {
  cursor: not-allowed;
  opacity: .45;
}

.sort-toggle svg {
  width: 14px;
  height: 14px;
}

.sort-hint {
  display: flex;
  align-items: center;
  gap: 8px;
  margin: -32px 0 30px;
  color: var(--color-text-muted);
  font-family: ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, monospace;
  font-size: 10.5px;
}

.sort-hint svg {
  width: 13px;
  height: 13px;
  flex: 0 0 auto;
}

.sort-message {
  color: var(--color-text-secondary);
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

  .head-actions {
    width: 100%;
    flex-wrap: wrap;
  }

  .bookmark-search {
    width: 100%;
    flex: 1 1 220px;
  }

  .sort-hint {
    margin: -20px 0 24px;
  }

  .bookmark-groups {
    gap: 40px;
  }
}
</style>
