<script setup lang="ts">
definePageMeta({ layout: 'admin' })
useSeoMeta({ title: '收藏管理' })

type CategoryCount = { children: number; bookmarks: number }
type Category = {
  id: number
  name: string
  parentId: number | null
  sort: number
  _count: CategoryCount
  children: Category[]
}
type FlatCategory = Category & { depth: number; path: string }
type Bookmark = {
  id: number
  categoryId: number
  name: string
  description: string
  iconUrl: string | null
  url: string
  sort: number
  isVisible: boolean
  category: { id: number; name: string; parentId: number | null }
  categoryPath: string
}

const session = useState<{ csrfToken: string } | null>('admin-session')
const { notifySuccess, notifyError } = useAdminFeedback()
const { confirm } = useAdminConfirm()
const deletingCategoryId = ref<number | null>(null)
const deletingBookmarkId = ref<number | null>(null)
const { data: categoryResponse, refresh: refreshCategories } = await useFetch<{ data: Category[] }>('/api/admin/bookmark-categories')
const { data: bookmarkResponse, refresh: refreshBookmarks } = await useFetch<{ data: Bookmark[] }>('/api/admin/bookmarks')
const categories = computed(() => categoryResponse.value?.data || [])
const bookmarks = computed(() => bookmarkResponse.value?.data || [])
const flatCategories = computed(() => flattenCategories(categories.value))

function flattenCategories(nodes: Category[], depth = 0, parents: string[] = []): FlatCategory[] {
  return nodes.flatMap((node) => {
    const path = [...parents, node.name].join(' / ')
    return [
      { ...node, depth, path },
      ...flattenCategories(node.children, depth + 1, [...parents, node.name]),
    ]
  })
}

/* Collapsed branches are pruned from the rendered list; the full flatten stays
   available for the parent selector and the bookmark filter. */
const collapsedCategoryIds = ref<number[]>([])
const collapsedCategories = computed(() => new Set(collapsedCategoryIds.value))

const visibleCategories = computed(() => {
  const collapsed = collapsedCategories.value
  const rows: FlatCategory[] = []
  const walk = (nodes: Category[], depth: number, parents: string[]) => {
    for (const node of nodes) {
      rows.push({ ...node, depth, path: [...parents, node.name].join(' / ') })
      if (node.children.length && !collapsed.has(node.id)) walk(node.children, depth + 1, [...parents, node.name])
    }
  }
  walk(categories.value, 0, [])
  return rows
})

const hasCollapsibleCategories = computed(() => flatCategories.value.some(category => category.children.length > 0))

const allCategoriesCollapsed = computed(() => {
  const collapsible = flatCategories.value.filter(category => category.children.length)
  return collapsible.length > 0 && collapsible.every(category => collapsedCategories.value.has(category.id))
})

function toggleCategory(id: number) {
  collapsedCategoryIds.value = collapsedCategories.value.has(id)
    ? collapsedCategoryIds.value.filter(item => item !== id)
    : [...collapsedCategoryIds.value, id]
}

function expandAllCategories() {
  collapsedCategoryIds.value = []
}

function collapseAllCategories() {
  collapsedCategoryIds.value = flatCategories.value.filter(category => category.children.length).map(category => category.id)
}

function revealCategory(id: number | null) {
  if (id === null) return
  const parents = new Map(flatCategories.value.map(category => [category.id, category.parentId ?? null]))
  const collapsed = new Set(collapsedCategoryIds.value)
  collapsed.delete(id)
  let ancestor = parents.get(id) ?? null
  while (ancestor !== null) {
    collapsed.delete(ancestor)
    ancestor = parents.get(ancestor) ?? null
  }
  collapsedCategoryIds.value = [...collapsed]
}

const blankCategory = () => ({ name: '', parentId: null as number | null, sort: 0 })
const categoryForm = reactive(blankCategory())
const editingCategoryId = ref<number | null>(null)
const categoryPending = ref(false)
const categoryEditorOpen = ref(false)

const categoryOptions = computed(() => flatCategories.value.map(category => ({
  label: category.path,
  value: category.id,
})))

const blankBookmark = () => ({
  categoryId: categoryOptions.value[0]?.value || 0,
  name: '',
  description: '',
  iconUrl: '',
  url: '',
  sort: 0,
  isVisible: true,
})
const bookmarkForm = reactive(blankBookmark())
const editingBookmarkId = ref<number | null>(null)
const bookmarkPending = ref(false)
const bookmarkEditorOpen = ref(false)
const search = ref('')
const filterCategoryId = ref(0)
const brokenIcons = ref(new Set<number>())

const editingCategory = computed(() => flatCategories.value.find(category => category.id === editingCategoryId.value))
const parentOptions = computed(() => {
  const blocked = new Set<number>()
  if (editingCategory.value) {
    const walk = (category: Category) => {
      blocked.add(category.id)
      category.children.forEach(walk)
    }
    walk(editingCategory.value)
  }

  return flatCategories.value
    .filter(category => !blocked.has(category.id))
    .map(category => ({
      label: `${'— '.repeat(category.depth)}${category.name}`,
      value: category.id,
    }))
})
const parentSelectItems = computed(() => [
  { label: '无（一级分类）', value: 0 },
  ...parentOptions.value,
])
const parentSelectValue = computed({
  get: () => categoryForm.parentId ?? 0,
  set: (value: number) => { categoryForm.parentId = value === 0 ? null : Number(value) },
})
const filterItems = computed(() => [
  { label: '全部分类', value: 0 },
  ...categoryOptions.value,
])
const filterCategoryIds = computed(() => {  if (!filterCategoryId.value) return null

  const category = flatCategories.value.find(item => item.id === filterCategoryId.value)
  if (!category) return new Set([filterCategoryId.value])

  const ids = new Set<number>()
  const walk = (node: Category) => {
    ids.add(node.id)
    node.children.forEach(walk)
  }
  walk(category)
  return ids
})
const filteredBookmarks = computed(() => {
  const keyword = search.value.trim().toLocaleLowerCase()
  return bookmarks.value.filter((bookmark) => {
    if (filterCategoryIds.value && !filterCategoryIds.value.has(bookmark.categoryId)) return false
    if (!keyword) return true
    return [bookmark.name, bookmark.description, bookmark.url, bookmark.categoryPath]
      .some(value => value?.toLocaleLowerCase().includes(keyword))
  })
})

/* View state is remembered per browser so the panel reopens the way it was left. */
const viewMode = useCookie<'list' | 'table'>('admin-bookmarks-view', { default: () => 'list' })
const groupedView = useCookie<boolean>('admin-bookmarks-grouped', { default: () => false })

const bookmarkGroups = computed(() => {
  const buckets = new Map<number, { id: number; label: string; name: string; parentPath: string; items: Bookmark[] }>()
  for (const bookmark of filteredBookmarks.value) {
    const bucket = buckets.get(bookmark.categoryId)
    if (bucket) bucket.items.push(bookmark)
    else {
      const segments = bookmark.categoryPath.split(' / ')
      buckets.set(bookmark.categoryId, {
        id: bookmark.categoryId,
        label: bookmark.categoryPath,
        name: segments[segments.length - 1] || '未分类',
        parentPath: segments.slice(0, -1).join(' / '),
        items: [bookmark],
      })
    }
  }

  const categoryOrder = new Map(flatCategories.value.map((category, index) => [category.id, index]))
  const rank = (id: number) => categoryOrder.get(id) ?? Number.MAX_SAFE_INTEGER
  return [...buckets.values()].sort((left, right) => rank(left.id) - rank(right.id))
})

const bookmarkSections = computed(() => (groupedView.value
  ? bookmarkGroups.value
  : [{ id: 0, label: '', name: '', parentPath: '', items: filteredBookmarks.value }]))

const draggingBookmarkId = ref<number | null>(null)
const dropTargetId = ref<number | null>(null)
const dropPosition = ref<'before' | 'after'>('after')
const reorderingBookmarks = ref(false)

function onBookmarkDragStart(event: DragEvent, bookmark: Bookmark) {
  if (reorderingBookmarks.value) {
    event.preventDefault()
    return
  }
  draggingBookmarkId.value = bookmark.id
  event.dataTransfer?.setData('text/plain', String(bookmark.id))
  if (event.dataTransfer) event.dataTransfer.effectAllowed = 'move'
}

/* Grouped mode only reorders inside one category: a drop never moves a row to
   another group, it just reshuffles that group's existing sort slots. */
function canDropOn(target: Bookmark) {
  if (draggingBookmarkId.value === null || draggingBookmarkId.value === target.id) return false
  if (!groupedView.value) return true
  const dragged = bookmarks.value.find(item => item.id === draggingBookmarkId.value)
  return dragged?.categoryId === target.categoryId
}

function onBookmarkDragOver(event: DragEvent, bookmark: Bookmark) {
  if (!canDropOn(bookmark)) return
  event.preventDefault()
  if (event.dataTransfer) event.dataTransfer.dropEffect = 'move'
  const rect = (event.currentTarget as HTMLElement).getBoundingClientRect()
  dropPosition.value = event.clientY - rect.top < rect.height / 2 ? 'before' : 'after'
  dropTargetId.value = bookmark.id
}

function onBookmarkDragLeave(bookmark: Bookmark) {
  if (dropTargetId.value === bookmark.id) dropTargetId.value = null
}

function clearBookmarkDrag() {
  draggingBookmarkId.value = null
  dropTargetId.value = null
}

async function onBookmarkDrop(event: DragEvent, target: Bookmark) {
  event.preventDefault()
  const draggedId = draggingBookmarkId.value
  const position = dropPosition.value
  clearBookmarkDrag()
  if (draggedId === null || !session.value || reorderingBookmarks.value) return
  if (!canDropOnBy(draggedId, target)) return

  const scope = groupedView.value
    ? (bookmarkGroups.value.find(group => group.id === target.categoryId)?.items ?? [])
    : filteredBookmarks.value
  const ids = scope.map(item => item.id)
  const from = ids.indexOf(draggedId)
  if (from === -1) return
  ids.splice(from, 1)
  const targetIndex = ids.indexOf(target.id)
  if (targetIndex === -1) return
  ids.splice(position === 'before' ? targetIndex : targetIndex + 1, 0, draggedId)

  await persistBookmarkOrder(ids, scope)
}

function canDropOnBy(draggedId: number, target: Bookmark) {
  if (!groupedView.value) return true
  const dragged = bookmarks.value.find(item => item.id === draggedId)
  return dragged?.categoryId === target.categoryId
}

async function persistBookmarkOrder(ids: number[], scope: Bookmark[]) {
  if (!session.value) return
  // Reuse the slots the moved rows already occupy so hidden rows and other
  // categories keep their numeric position.
  const slots = scope.map(item => item.sort).sort((left, right) => left - right)
  const ordered = ids.map((id, index) => ({ id, sort: slots[index] ?? index }))
  const sortById = new Map(ordered.map(entry => [entry.id, entry.sort]))
  const previous = bookmarks.value

  bookmarkResponse.value = {
    data: previous
      .map(item => (sortById.has(item.id) ? { ...item, sort: sortById.get(item.id) as number } : item))
      .sort((left, right) => left.sort - right.sort || right.id - left.id),
  }

  reorderingBookmarks.value = true
  try {
    await $fetch('/api/admin/bookmarks/reorder', {
      method: 'PATCH',
      body: { entries: ordered },
      headers: { 'X-CSRF-Token': session.value.csrfToken },
    })
    notifySuccess('排序已保存')
  } catch (error) {
    bookmarkResponse.value = { data: previous }
    notifyError(error, '保存排序失败')
  } finally {
    reorderingBookmarks.value = false
  }
}

watch(categoryOptions, (items) => {
  if (!items.some(item => item.value === bookmarkForm.categoryId)) {
    bookmarkForm.categoryId = items[0]?.value || 0
  }
})

function resetCategory() {
  editingCategoryId.value = null
  categoryEditorOpen.value = false
  Object.assign(categoryForm, blankCategory())
}

function startCreateCategory(parentId: number | null = null) {
  editingCategoryId.value = null
  Object.assign(categoryForm, { name: '', parentId, sort: 0 })
  categoryEditorOpen.value = true
  // Expand the branch behind the dialog so the new node is visible on close.
  revealCategory(parentId)
}

function editCategory(category: FlatCategory) {
  editingCategoryId.value = category.id
  categoryEditorOpen.value = true
  Object.assign(categoryForm, { name: category.name, parentId: category.parentId, sort: category.sort })
}

async function saveCategory() {
  if (!session.value || categoryPending.value) return
  categoryPending.value = true
  const parentId = categoryForm.parentId
  try {
    const successMessage = editingCategoryId.value ? '分类已保存' : '分类已创建'
    await $fetch(editingCategoryId.value ? `/api/admin/bookmark-categories/${editingCategoryId.value}` : '/api/admin/bookmark-categories', {
      method: editingCategoryId.value ? 'PUT' : 'POST',
      body: { ...categoryForm, sort: Number(categoryForm.sort) },
      headers: { 'X-CSRF-Token': session.value.csrfToken },
    })
    resetCategory()
    await Promise.all([refreshCategories(), refreshBookmarks()])
    revealCategory(parentId)
    notifySuccess(successMessage)
  } catch (error) {
    notifyError(error, '保存分类失败')
  } finally {
    categoryPending.value = false
  }
}

async function removeCategory(category: FlatCategory) {
  if (!session.value || deletingCategoryId.value !== null) return
  if (!(await confirm({ title: '删除分类', message: `确定删除分类“${category.name}”吗？`, confirmLabel: '删除', color: 'error' }))) return
  deletingCategoryId.value = category.id
  try {
    await $fetch(`/api/admin/bookmark-categories/${category.id}`, {
      method: 'DELETE',
      headers: { 'X-CSRF-Token': session.value.csrfToken },
    })
    if (editingCategoryId.value === category.id) resetCategory()
    await refreshCategories()
    notifySuccess('分类已删除')
  } catch (error) {
    notifyError(error, '删除分类失败')
  } finally {
    deletingCategoryId.value = null
  }
}

function resetBookmark() {
  editingBookmarkId.value = null
  bookmarkEditorOpen.value = false
  Object.assign(bookmarkForm, blankBookmark())
}

function startCreateBookmark(categoryId?: number) {
  editingBookmarkId.value = null
  Object.assign(bookmarkForm, {
    ...blankBookmark(),
    categoryId: categoryId || categoryOptions.value[0]?.value || 0,
  })
  bookmarkEditorOpen.value = true
}

function editBookmark(bookmark: Bookmark) {
  editingBookmarkId.value = bookmark.id
  bookmarkEditorOpen.value = true
  Object.assign(bookmarkForm, {
    categoryId: bookmark.categoryId,
    name: bookmark.name,
    description: bookmark.description,
    iconUrl: bookmark.iconUrl || '',
    url: bookmark.url,
    sort: bookmark.sort,
    isVisible: bookmark.isVisible,
  })
}

async function saveBookmark() {
  if (!session.value || bookmarkPending.value) return
  bookmarkPending.value = true
  try {
    const successMessage = editingBookmarkId.value ? '收藏已保存' : '收藏已添加'
    await $fetch(editingBookmarkId.value ? `/api/admin/bookmarks/${editingBookmarkId.value}` : '/api/admin/bookmarks', {
      method: editingBookmarkId.value ? 'PUT' : 'POST',
      body: {
        ...bookmarkForm,
        categoryId: Number(bookmarkForm.categoryId),
        sort: Number(bookmarkForm.sort),
      },
      headers: { 'X-CSRF-Token': session.value.csrfToken },
    })
    resetBookmark()
    await Promise.all([refreshBookmarks(), refreshCategories()])
    notifySuccess(successMessage)
  } catch (error) {
    notifyError(error, '保存收藏失败')
  } finally {
    bookmarkPending.value = false
  }
}

async function removeBookmark(bookmark: Bookmark) {
  if (!session.value || deletingBookmarkId.value !== null) return
  if (!(await confirm({ title: '删除收藏', message: `确定删除收藏“${bookmark.name}”吗？`, confirmLabel: '删除', color: 'error' }))) return
  deletingBookmarkId.value = bookmark.id
  try {
    await $fetch(`/api/admin/bookmarks/${bookmark.id}`, {
      method: 'DELETE',
      headers: { 'X-CSRF-Token': session.value.csrfToken },
    })
    if (editingBookmarkId.value === bookmark.id) resetBookmark()
    await Promise.all([refreshBookmarks(), refreshCategories()])
    notifySuccess('收藏已删除')
  } catch (error) {
    notifyError(error, '删除收藏失败')
  } finally {
    deletingBookmarkId.value = null
  }
}

function markIconBroken(id: number) {
  brokenIcons.value = new Set([...brokenIcons.value, id])
}
</script>

<template>
  <section class="bookmarks-admin-page">
    <AdminPageHeader title="收藏管理" description="维护多级分类与公开展示的网站收藏。" />

    <div class="workspace-grid">
      <UCard class="category-card">
        <template #header>
          <div class="card-heading">
            <div class="card-heading-main">
              <span><UIcon name="i-lucide-folders" /></span>
              <div><strong>分类结构</strong><p>{{ categories.length }} 个一级分类，{{ flatCategories.length }} 个分类</p></div>
            </div>
            <UButton
              v-if="hasCollapsibleCategories"
              size="sm"
              color="neutral"
              variant="ghost"
              square
              :icon="allCategoriesCollapsed ? 'i-lucide-chevrons-down' : 'i-lucide-chevrons-up'"
              :aria-label="allCategoriesCollapsed ? '展开全部分类' : '收起全部分类'"
              :title="allCategoriesCollapsed ? '展开全部' : '收起全部'"
              @click="allCategoriesCollapsed ? expandAllCategories() : collapseAllCategories()"
            />
            <UButton size="sm" icon="i-lucide-plus" @click="startCreateCategory()">新增</UButton>
          </div>
        </template>

        <UEmpty v-if="!categories.length" variant="naked" icon="i-lucide-folder-plus" title="暂无分类" description="先创建一级分类，再继续添加子分类。" />
        <div v-else class="category-tree">
          <div
            v-for="category in visibleCategories"
            :key="category.id"
            class="category-row"
            :class="{ 'is-root': category.depth === 0, 'is-collapsed': collapsedCategories.has(category.id) }"
            :style="{ '--depth': category.depth }"
          >
            <div class="category-lead">
              <button
                v-if="category.children.length"
                type="button"
                class="tree-toggle"
                :class="{ 'is-open': !collapsedCategories.has(category.id) }"
                :aria-expanded="!collapsedCategories.has(category.id)"
                :aria-label="`${collapsedCategories.has(category.id) ? '展开' : '收起'} ${category.name}`"
                @click="toggleCategory(category.id)"
              ><UIcon name="i-lucide-chevron-right" /></button>
              <span v-else class="tree-toggle is-leaf" aria-hidden="true" />
              <span class="category-icon"><UIcon :name="category.children.length && !collapsedCategories.has(category.id) ? 'i-lucide-folder-open' : 'i-lucide-folder'" /></span>
            </div>
            <div class="category-copy"><strong :title="category.name">{{ category.name }}</strong><small>{{ category._count.children }} 个子分类 · {{ category._count.bookmarks }} 个收藏</small></div>
            <div class="row-actions">
              <UButton icon="i-lucide-folder-plus" size="xs" color="neutral" variant="ghost" square :aria-label="`在 ${category.name} 下新增子分类`" @click="startCreateCategory(category.id)" />
              <UButton icon="i-lucide-pencil" size="xs" color="neutral" variant="ghost" square :aria-label="`编辑 ${category.name}`" @click="editCategory(category)" />
              <UButton icon="i-lucide-trash-2" size="xs" color="error" variant="ghost" square :aria-label="`删除 ${category.name}`" :loading="deletingCategoryId === category.id" :disabled="deletingCategoryId !== null" @click="removeCategory(category)" />
            </div>
          </div>
        </div>
      </UCard>

      <UCard class="bookmark-list-card">
        <template #header>
          <div class="bookmark-list-header">
            <div class="list-heading">
              <div><strong>全部收藏</strong><p>显示 {{ filteredBookmarks.length }} / {{ bookmarks.length }} 项</p></div>
              <div class="list-tools">
                <div class="view-switch" role="group" aria-label="视图切换">
                  <UButton
                    size="xs"
                    :color="viewMode === 'list' ? 'primary' : 'neutral'"
                    :variant="viewMode === 'list' ? 'soft' : 'ghost'"
                    icon="i-lucide-list"
                    aria-label="列表视图"
                    :aria-pressed="viewMode === 'list'"
                    @click="viewMode = 'list'"
                  />
                  <UButton
                    size="xs"
                    :color="viewMode === 'table' ? 'primary' : 'neutral'"
                    :variant="viewMode === 'table' ? 'soft' : 'ghost'"
                    icon="i-lucide-table"
                    aria-label="表格视图"
                    :aria-pressed="viewMode === 'table'"
                    @click="viewMode = 'table'"
                  />
                </div>
                <UButton
                  size="sm"
                  :color="groupedView ? 'primary' : 'neutral'"
                  :variant="groupedView ? 'soft' : 'ghost'"
                  icon="i-lucide-layers"
                  :aria-pressed="groupedView"
                  title="按分类分组展示"
                  @click="groupedView = !groupedView"
                >
                  分组
                </UButton>
                <UButton size="sm" icon="i-lucide-plus" @click="startCreateBookmark()">新增收藏</UButton>
              </div>
            </div>
            <div class="filters"><UInput v-model="search" icon="i-lucide-search" placeholder="搜索名称、描述或网址" /><USelect v-model.number="filterCategoryId" :items="filterItems" value-key="value" class="filter-select" /></div>
          </div>
        </template>

        <UEmpty v-if="!filteredBookmarks.length" variant="naked" icon="i-lucide-bookmark" title="暂无收藏" description="添加网站后会在这里集中管理。" />
        <div v-else class="bookmark-sections">
          <section v-for="section in bookmarkSections" :key="section.id" class="bookmark-group">
            <header v-if="section.label" class="bookmark-group-head">
              <UIcon name="i-lucide-folder" />
              <span v-if="section.parentPath" class="group-path">{{ section.parentPath }} /</span>
              <strong>{{ section.name }}</strong>
              <span class="group-count">{{ section.items.length }} 项</span>
            </header>

            <div v-if="viewMode === 'list'" class="bookmark-list">
              <article
                v-for="bookmark in section.items"
                :key="bookmark.id"
                class="bookmark-row"
                draggable="true"
                :class="{
                  'is-dragging': draggingBookmarkId === bookmark.id,
                  'is-drop-before': dropTargetId === bookmark.id && dropPosition === 'before',
                  'is-drop-after': dropTargetId === bookmark.id && dropPosition === 'after',
                }"
                @dragstart="onBookmarkDragStart($event, bookmark)"
                @dragover="onBookmarkDragOver($event, bookmark)"
                @dragleave="onBookmarkDragLeave(bookmark)"
                @drop="onBookmarkDrop($event, bookmark)"
                @dragend="clearBookmarkDrag"
              >
                <span class="drag-handle" title="拖拽调整顺序" aria-hidden="true"><UIcon name="i-lucide-grip-vertical" /></span>
                <span class="bookmark-icon">
                  <img v-if="bookmark.iconUrl && !brokenIcons.has(bookmark.id)" :src="bookmark.iconUrl" alt="" @error="markIconBroken(bookmark.id)">
                  <UIcon v-else name="i-lucide-globe-2" />
                </span>
                <div class="bookmark-info">
                  <div class="bookmark-title-row"><strong>{{ bookmark.name }}</strong><UBadge :color="bookmark.isVisible ? 'success' : 'neutral'" variant="subtle" size="sm">{{ bookmark.isVisible ? '公开' : '隐藏' }}</UBadge></div>
                  <p>{{ bookmark.description }}</p>
                  <div class="bookmark-meta">
                    <small>{{ bookmark.categoryPath }} · 排序 {{ bookmark.sort }}</small>
                    <a class="bookmark-url" :href="bookmark.url" target="_blank" rel="noopener noreferrer">{{ bookmark.url }}<UIcon name="i-lucide-external-link" /></a>
                  </div>
                </div>
                <div class="row-actions"><UButton icon="i-lucide-pencil" size="xs" color="neutral" variant="ghost" square :aria-label="`编辑 ${bookmark.name}`" @click="editBookmark(bookmark)" /><UButton icon="i-lucide-trash-2" size="xs" color="error" variant="ghost" square :aria-label="`删除 ${bookmark.name}`" :loading="deletingBookmarkId === bookmark.id" :disabled="deletingBookmarkId !== null" @click="removeBookmark(bookmark)" /></div>
              </article>
            </div>

            <div v-else class="bookmark-table-scroll">
              <table class="bookmark-table">
                <thead>
                  <tr><th>收藏</th><th>分类</th><th>网址</th><th class="col-num">排序</th><th class="col-actions" aria-label="操作" /></tr>
                </thead>
                <tbody>
                  <tr
                    v-for="bookmark in section.items"
                    :key="bookmark.id"
                    draggable="true"
                    :class="{
                      'is-dragging': draggingBookmarkId === bookmark.id,
                      'is-drop-before': dropTargetId === bookmark.id && dropPosition === 'before',
                      'is-drop-after': dropTargetId === bookmark.id && dropPosition === 'after',
                    }"
                    @dragstart="onBookmarkDragStart($event, bookmark)"
                    @dragover="onBookmarkDragOver($event, bookmark)"
                    @dragleave="onBookmarkDragLeave(bookmark)"
                    @drop="onBookmarkDrop($event, bookmark)"
                    @dragend="clearBookmarkDrag"
                  >
                    <td class="cell-name">
                      <span class="drag-handle" title="拖拽调整顺序" aria-hidden="true"><UIcon name="i-lucide-grip-vertical" /></span>
                      <span class="bookmark-icon">
                        <img v-if="bookmark.iconUrl && !brokenIcons.has(bookmark.id)" :src="bookmark.iconUrl" alt="" @error="markIconBroken(bookmark.id)">
                        <UIcon v-else name="i-lucide-globe-2" />
                      </span>
                      <span class="cell-name-text">
                        <strong>{{ bookmark.name }}</strong>
                        <UBadge :color="bookmark.isVisible ? 'success' : 'neutral'" variant="subtle" size="sm">{{ bookmark.isVisible ? '公开' : '隐藏' }}</UBadge>
                      </span>
                    </td>
                    <td class="cell-path">{{ bookmark.categoryPath }}</td>
                    <td class="cell-url"><a :href="bookmark.url" target="_blank" rel="noopener noreferrer">{{ bookmark.url }}</a></td>
                    <td class="col-num">{{ bookmark.sort }}</td>
                    <td class="col-actions">
                      <UButton icon="i-lucide-pencil" size="xs" color="neutral" variant="ghost" square :aria-label="`编辑 ${bookmark.name}`" @click="editBookmark(bookmark)" />
                      <UButton icon="i-lucide-trash-2" size="xs" color="error" variant="ghost" square :aria-label="`删除 ${bookmark.name}`" :loading="deletingBookmarkId === bookmark.id" :disabled="deletingBookmarkId !== null" @click="removeBookmark(bookmark)" />
                    </td>
                  </tr>
                </tbody>
              </table>
            </div>
          </section>
        </div>
      </UCard>
    </div>

    <UModal v-model:open="categoryEditorOpen" :title="editingCategoryId ? '编辑分类' : '新增分类'" description="分类支持任意层级，父分类决定它挂在哪一枝。" :ui="{ content: 'max-w-lg' }">
      <template #body>
        <form id="category-form" class="modal-form" @submit.prevent="saveCategory">
          <UFormField label="分类名称" required><UInput v-model="categoryForm.name" class="w-full" placeholder="例如：开发资源" /></UFormField>
          <UFormField label="父分类" description="留空表示一级分类，可选择任意已有分类">
            <USelect v-model="parentSelectValue" :items="parentSelectItems" value-key="value" class="w-full" />
          </UFormField>
          <UFormField label="排序"><UInput v-model.number="categoryForm.sort" type="number" min="-9999" max="9999" class="w-full" /></UFormField>
        </form>
      </template>
      <template #footer>
        <div class="modal-actions">
          <UButton color="neutral" variant="ghost" @click="resetCategory">取消</UButton>
          <UButton type="submit" form="category-form" icon="i-lucide-check" :loading="categoryPending">
            {{ editingCategoryId ? '保存分类' : '创建分类' }}
          </UButton>
        </div>
      </template>
    </UModal>

    <UModal v-model:open="bookmarkEditorOpen" :title="editingBookmarkId ? '编辑收藏' : '新增收藏'" description="收藏会按分类整理后展示在前台收藏页。" :ui="{ content: 'max-w-xl' }">
      <template #body>
        <form id="bookmark-form" class="modal-form" @submit.prevent="saveBookmark">
          <div class="modal-form-grid">
            <UFormField label="所属分类" required>
              <USelect v-model.number="bookmarkForm.categoryId" :items="categoryOptions" value-key="value" :disabled="!categoryOptions.length" placeholder="请先创建分类" class="w-full" />
            </UFormField>
            <UFormField label="收藏名称" required><UInput v-model="bookmarkForm.name" class="w-full" placeholder="网站名称" /></UFormField>
            <UFormField label="网站 URL" required><UInput v-model="bookmarkForm.url" icon="i-lucide-link" class="w-full" placeholder="https://example.com" /></UFormField>
            <UFormField label="图标 URL" hint="可留空"><UInput v-model="bookmarkForm.iconUrl" icon="i-lucide-image" class="w-full" placeholder="https://example.com/icon.png" /></UFormField>
            <UFormField label="描述" required class="span-two"><UTextarea v-model="bookmarkForm.description" :rows="3" class="w-full" placeholder="简要说明这个网站的用途" /></UFormField>
            <UFormField label="排序"><UInput v-model.number="bookmarkForm.sort" type="number" min="-9999" max="9999" class="w-full" /></UFormField>
            <label class="visibility-toggle"><input v-model="bookmarkForm.isVisible" type="checkbox"><span><strong>公开展示</strong><small>关闭后不会出现在前台收藏页</small></span></label>
          </div>
        </form>
      </template>
      <template #footer>
        <div class="modal-actions">
          <UButton color="neutral" variant="ghost" @click="resetBookmark">取消</UButton>
          <UButton type="submit" form="bookmark-form" icon="i-lucide-check" :loading="bookmarkPending" :disabled="!categoryOptions.length">
            {{ editingBookmarkId ? '保存收藏' : '添加收藏' }}
          </UButton>
        </div>
      </template>
    </UModal>
  </section>
</template>

<style scoped>
.bookmarks-admin-page {
  display: grid;
  gap: 12px;
}

.workspace-grid {
  display: grid;
  grid-template-columns: minmax(320px, 380px) minmax(0, 1fr);
  gap: 18px;
  align-items: start;
}

/* The category tree stays put while the bookmark list scrolls; it gets its own
   scroll area once the tree is taller than the viewport. */
.category-card {
  position: sticky;
  top: calc(var(--admin-header-height, 60px) + 16px);
  display: flex;
  max-height: calc(100vh - var(--admin-header-height, 60px) - 32px);
  flex-direction: column;
}

.category-card > * {
  flex: none;
}

/* UCard renders the slot inside a padded body div; that body is the part that
   scrolls so the card header stays visible. */
.category-card > :last-child {
  flex: 1 1 auto;
  min-height: 0;
  overflow-y: auto;
  overscroll-behavior: contain;
}

.card-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
}

.card-heading-main {
  display: flex;
  align-items: center;
  gap: 12px;
  min-width: 0;
}

.card-heading-main>span {
  display: grid;
  width: 36px;
  height: 36px;
  flex: 0 0 auto;
  place-items: center;
  border-radius: 10px;
  color: #18745d;
  background: rgba(16,185,129,.12);
}

.card-heading strong,.list-heading strong {
  display: block;
  font-size: 14px;
  font-weight: 680;
}

.card-heading p,.list-heading p {
  margin: 4px 0 0;
  color: var(--color-text-muted);
  font-size: 10px;
}

.modal-form {
  display: grid;
  gap: 14px;
}

.modal-form-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 14px;
}

@media (max-width: 640px) {
  .modal-form-grid {
    grid-template-columns: minmax(0, 1fr);
  }
}

.modal-actions {
  display: flex;
  width: 100%;
  justify-content: flex-end;
  gap: 8px;
}

.span-two {
  grid-column: 1/-1;
}

.filter-select {
  width: 100%;
}

.visibility-toggle {
  display: flex;
  min-height: 58px;
  align-items: center;
  gap: 10px;
  padding: 10px 12px;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  cursor: pointer;
}

.visibility-toggle input {
  width: 16px;
  height: 16px;
  accent-color: var(--color-primary);
}

.visibility-toggle span {
  display: grid;
  gap: 4px;
}

.visibility-toggle strong {
  font-size: 12px;
}

.visibility-toggle small {
  color: var(--color-text-muted);
  font-size: 10px;
}

.list-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.category-tree,.bookmark-list {
  display: grid;
}

.category-row {
  display: grid;
  grid-template-columns: auto minmax(0,1fr) auto;
  align-items: center;
  gap: 10px;
  min-height: 54px;
  padding: 8px 8px 8px calc(8px + var(--depth) * 18px);
  border-radius: 8px;
}

.category-lead {
  display: flex;
  align-items: center;
  gap: 2px;
}

.tree-toggle {
  display: grid;
  width: 20px;
  height: 20px;
  flex: none;
  place-items: center;
  padding: 0;
  border: 0;
  border-radius: 6px;
  background: none;
  color: var(--color-text-muted);
  cursor: pointer;
  transition: color 120ms var(--admin-ease, ease), background-color 120ms var(--admin-ease, ease);
}

.tree-toggle:hover {
  background: var(--color-background-secondary);
  color: var(--color-primary);
}

.tree-toggle.is-leaf {
  cursor: default;
  background: none;
}

.tree-toggle :deep(svg) {
  width: 14px;
  height: 14px;
  transition: transform 140ms var(--admin-ease, ease);
}

.tree-toggle.is-open :deep(svg) {
  transform: rotate(90deg);
}

.category-row.is-collapsed .category-icon {
  color: var(--color-text-muted);
}

.category-row.is-root:not(:first-child) {
  margin-top: 6px;
  border-top: 1px solid var(--color-border);
  border-top-left-radius: 0;
  border-top-right-radius: 0;
}

.category-row:hover,.bookmark-row:hover {
  background: var(--color-background-secondary);
}

.category-copy {
  display: grid;
  gap: 4px;
  min-width: 0;
}

.category-row.is-root strong {
  font-size: 12px;
}

.category-copy strong,
.category-copy small {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.category-copy strong {
  font-size: 12px;
}

.category-row small {
  color: var(--color-text-muted);
  font-size: 10px;
}

.category-icon {
  display: grid;
  width: 32px;
  height: 32px;
  place-items: center;
  border-radius: 8px;
  color: var(--color-primary);
  background: color-mix(in srgb,var(--color-primary) 10%,transparent);
}

.row-actions {
  display: flex;
  justify-content: flex-end;
  gap: 2px;
}

.bookmark-list-header {
  display: grid;
  gap: 14px;
}

.list-tools {
  display: flex;
  align-items: center;
  gap: 8px;
}

.view-switch {
  display: flex;
  align-items: center;
  gap: 2px;
  padding: 2px;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  background: var(--color-background-secondary);
}

.bookmark-sections {
  display: grid;
  gap: 18px;
}

.bookmark-group-head {
  display: flex;
  align-items: center;
  gap: 8px;
  padding: 0 8px 8px;
  color: var(--color-text-secondary);
  font-size: 11px;
}

.bookmark-group-head svg {
  width: 14px;
  height: 14px;
  color: var(--color-primary);
}

.bookmark-group-head strong {
  color: var(--color-text);
  font-size: 12px;
  font-weight: 680;
}

.bookmark-group-head .group-path {
  color: var(--color-text-muted);
  font-size: 10px;
}

.bookmark-group-head span.group-count {
  padding: 1px 6px;
  border-radius: 999px;
  background: var(--color-background-secondary);
  font-size: 10px;
}

.filters {
  display: grid;
  grid-template-columns: minmax(180px,1fr) 210px;
  gap: 8px;
}

.drag-handle {
  display: grid;
  width: 16px;
  height: 32px;
  margin-left: -6px;
  flex: 0 0 auto;
  place-items: center;
  color: var(--color-text-muted);
  cursor: grab;
  opacity: 0;
  transition: opacity .12s ease;
}

.drag-handle svg {
  width: 14px;
  height: 14px;
}

.bookmark-row:hover .drag-handle,
.bookmark-table tbody tr:hover .drag-handle,
.drag-handle:focus-visible {
  opacity: 1;
}

.bookmark-row {
  display: grid;
  grid-template-columns: 16px 42px minmax(0,1fr) 64px;
  align-items: center;
  gap: 12px;
  padding: 14px 8px;
  border-top: 1px solid var(--color-border);
}

.bookmark-row:first-child {
  border-top: 0;
}

.bookmark-row.is-dragging,
.bookmark-table tbody tr.is-dragging {
  opacity: .45;
}

.bookmark-row.is-drop-before,
.bookmark-table tbody tr.is-drop-before {
  box-shadow: inset 0 2px 0 var(--color-primary);
}

.bookmark-row.is-drop-after,
.bookmark-table tbody tr.is-drop-after {
  box-shadow: inset 0 -2px 0 var(--color-primary);
}

.bookmark-table-scroll {
  overflow-x: auto;
}

.bookmark-table {
  width: 100%;
  min-width: 720px;
  border-collapse: separate;
  border-spacing: 0;
  font-size: 11px;
}

.bookmark-table thead th {
  padding: 8px;
  border-bottom: 1px solid var(--color-border);
  color: var(--color-text-muted);
  font-size: 10px;
  font-weight: 600;
  text-align: left;
  white-space: nowrap;
}

.bookmark-table tbody td {
  padding: 10px 8px;
  border-top: 1px solid var(--color-border);
  vertical-align: middle;
}

.bookmark-table tbody tr:first-child td {
  border-top: 0;
}

.bookmark-table tbody tr:hover {
  background: color-mix(in srgb, var(--color-primary) 4%, transparent);
}

.bookmark-table .cell-name {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 220px;
}

.bookmark-table .cell-name .bookmark-icon {
  width: 28px;
  height: 28px;
  border-radius: 8px;
}

.bookmark-table .cell-name .bookmark-icon svg {
  width: 14px;
  height: 14px;
}

.cell-name-text {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 8px;
}

.cell-name-text strong {
  overflow: hidden;
  font-size: 12px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.cell-path {
  color: var(--color-text-secondary);
  white-space: nowrap;
}

.cell-url {
  max-width: 260px;
}

.cell-url a {
  display: block;
  overflow: hidden;
  color: var(--color-primary);
  text-overflow: ellipsis;
  white-space: nowrap;
}

.col-num {
  width: 56px;
  text-align: right;
  white-space: nowrap;
}

.bookmark-table thead .col-actions {
  width: 72px;
}

.bookmark-table tbody .col-actions {
  display: flex;
  justify-content: flex-end;
  gap: 2px;
  white-space: nowrap;
}

@media (max-width: 720px) {
  .filters {
    grid-template-columns: minmax(0,1fr);
  }

  .drag-handle {
    display: none;
  }

  .bookmark-row {
    grid-template-columns: 42px minmax(0,1fr) 64px;
  }
}

.bookmark-icon {
  display: grid;
  width: 40px;
  height: 40px;
  overflow: hidden;
  place-items: center;
  border: 1px solid var(--color-border);
  border-radius: 12px;
  color: var(--color-text-secondary);
  background: var(--color-background);
}

.bookmark-icon img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.bookmark-icon svg {
  width: 18px;
  height: 18px;
}

.bookmark-info {
  min-width: 0;
}

.bookmark-title-row {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 8px;
}

.bookmark-info strong {
  overflow: hidden;
  font-size: 12px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.bookmark-info p {
  display: -webkit-box;
  margin: 6px 0 0;
  color: var(--color-text-secondary);
  overflow: hidden;
  font-size: 10px;
  line-height: 1.5;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.bookmark-meta {
  display: flex;
  min-width: 0;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px 10px;
  margin-top: 6px;
}

.bookmark-info small {
  color: var(--color-text-muted);
  font-size: 10px;
  overflow-wrap: anywhere;
}

.bookmark-url {
  display: inline-flex;
  min-width: 0;
  max-width: 100%;
  align-items: center;
  gap: 6px;
  overflow: hidden;
  color: var(--color-primary);
  font-size: 10px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.bookmark-url svg {
  width: 12px;
  flex: 0 0 auto;
}

@media (max-width: 1100px) {
  .workspace-grid {
    grid-template-columns: 1fr;
  }

  .category-card {
    position: static;
    max-height: none;
  }

  .category-card > :last-child {
    overflow: visible;
  }
}

@media (max-width: 680px) {
  .bookmark-fields,
  .filters {
    grid-template-columns: 1fr;
  }

  .span-two {
    grid-column: auto;
  }

  .bookmark-row {
    grid-template-columns: 42px minmax(0,1fr) 64px;
  }
}
</style>
