<script setup lang="ts">
definePageMeta({ layout: 'admin' })
useSeoMeta({ title: '文章管理' })

type Post = { id: number; title: string; status: 'PUBLISHED' | 'ARCHIVED'; viewCount: number; publishedAt: string; createdAt: string; updatedAt: string; tags: { id: number; name: string }[] }
type SortField = 'title' | 'viewCount' | 'createdAt' | 'updatedAt'
type SortOrder = 'asc' | 'desc'

const session = useState<{ csrfToken: string } | null>('admin-session')
const { notifySuccess, notifyError } = useAdminFeedback()
const { confirm } = useAdminConfirm()
const deletingId = ref<number | null>(null)
const search = ref('')
const status = ref('ALL')
const page = ref(1)
const sort = ref<SortField>('updatedAt')
const order = ref<SortOrder>('desc')
const statusItems = [
  { label: '全部状态', value: 'ALL' },
  { label: '已发布', value: 'PUBLISHED' },
  { label: '已归档', value: 'ARCHIVED' },
]
const query = computed(() => ({
  page: page.value,
  pageSize: 20,
  q: search.value || undefined,
  status: status.value === 'ALL' ? undefined : status.value,
  sort: sort.value,
  order: order.value,
}))
const { data: response, pending, refresh } = await useFetch<{ data: { items: Post[]; total: number; pageSize: number } }>('/api/admin/posts', { query })
const posts = computed(() => response.value?.data.items || [])
const total = computed(() => response.value?.data.total || 0)
const pageSize = computed(() => response.value?.data.pageSize || 20)
const rowNumber = (index: number) => (page.value - 1) * pageSize.value + index + 1
const formatDate = (value: string) => new Date(value).toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' })

// Text sorts start at A, dates and counts start at the newest/largest.
const DEFAULT_ORDER: Record<SortField, SortOrder> = { title: 'asc', viewCount: 'desc', createdAt: 'desc', updatedAt: 'desc' }

function toggleSort(field: SortField) {
  if (sort.value === field) {
    order.value = order.value === 'asc' ? 'desc' : 'asc'
  } else {
    sort.value = field
    order.value = DEFAULT_ORDER[field]
  }
}

function sortIcon(field: SortField) {
  if (sort.value !== field) return 'i-lucide-arrow-up-down'
  return order.value === 'asc' ? 'i-lucide-arrow-up' : 'i-lucide-arrow-down'
}

function ariaSort(field: SortField) {
  if (sort.value !== field) return 'none'
  return order.value === 'asc' ? 'ascending' : 'descending'
}

watch([search, status], () => { page.value = 1 })

async function remove(post: Post) {
  if (!session.value || deletingId.value !== null) return
  if (!(await confirm({ title: '删除文章', message: `确定永久删除《${post.title}》吗？删除后无法恢复。`, confirmLabel: '删除', color: 'error' }))) return
  deletingId.value = post.id
  try {
    await $fetch(`/api/admin/posts/${post.id}`, { method: 'DELETE', headers: { 'X-CSRF-Token': session.value.csrfToken } })
    await refresh()
    notifySuccess('文章已删除')
  } catch (error) {
    notifyError(error, '删除文章失败')
  } finally {
    deletingId.value = null
  }
}
</script>

<template>
  <section class="posts-page">
    <AdminPageHeader title="文章管理" :description="`管理博客中的全部内容，共 ${total} 篇文章。`">
      <template #actions><UButton to="/admin/posts/new" icon="i-lucide-plus" size="sm">新建文章</UButton></template>
    </AdminPageHeader>

    <section class="panel toolbar-panel">
      <div class="toolbar">
        <UInput v-model="search" icon="i-lucide-search" placeholder="搜索文章标题…" class="search-input" />
        <USelect v-model="status" :items="statusItems" value-key="value" class="status-select" />
        <span class="result-count">{{ total }} 条结果</span>
      </div>
    </section>

    <section class="panel table-panel">
      <div v-if="pending" class="loading-list">
        <USkeleton v-for="index in 6" :key="index" class="h-14 w-full" />
      </div>
      <div v-else-if="!posts.length" class="empty-state">
        <span><UIcon name="i-lucide-file-search" /></span>
        <strong>没有找到文章</strong>
        <p>调整搜索条件，或者创建一篇新文章。</p>
        <UButton to="/admin/posts/new" icon="i-lucide-plus" size="sm">新建文章</UButton>
      </div>
      <div v-else class="table-scroll">
        <table>
          <thead>
            <tr>
              <th class="col-index">序号</th>
              <th class="col-id">ID</th>
              <th :aria-sort="ariaSort('title')">
                <button type="button" class="th-sort" :class="{ 'is-active': sort === 'title' }" @click="toggleSort('title')">
                  文章
                  <UIcon :name="sortIcon('title')" class="sort-icon" />
                </button>
              </th>
              <th>状态</th>
              <th :aria-sort="ariaSort('viewCount')" class="col-num">
                <button type="button" class="th-sort" :class="{ 'is-active': sort === 'viewCount' }" @click="toggleSort('viewCount')">
                  浏览量
                  <UIcon :name="sortIcon('viewCount')" class="sort-icon" />
                </button>
              </th>
              <th :aria-sort="ariaSort('updatedAt')">
                <button type="button" class="th-sort" :class="{ 'is-active': sort === 'updatedAt' }" @click="toggleSort('updatedAt')">
                  更新时间
                  <UIcon :name="sortIcon('updatedAt')" class="sort-icon" />
                </button>
              </th>
              <th :aria-sort="ariaSort('createdAt')">
                <button type="button" class="th-sort" :class="{ 'is-active': sort === 'createdAt' }" @click="toggleSort('createdAt')">
                  创建时间
                  <UIcon :name="sortIcon('createdAt')" class="sort-icon" />
                </button>
              </th>
              <th><span class="sr-only">操作</span></th>
            </tr>
          </thead>
          <tbody>
            <tr v-for="(post, index) in posts" :key="post.id">
              <td class="col-index">{{ rowNumber(index) }}</td>
              <td class="col-id">{{ post.id }}</td>
              <td>
                <NuxtLink :to="`/admin/posts/${post.id}/edit`" class="post-title">{{ post.title }}</NuxtLink>
                <div class="post-tags"><span v-for="tag in post.tags" :key="tag.id">{{ tag.name }}</span><span v-if="!post.tags.length">无标签</span></div>
              </td>
              <td><UBadge :color="post.status === 'PUBLISHED' ? 'success' : 'neutral'" variant="subtle" size="sm">{{ post.status === 'PUBLISHED' ? '已发布' : '已归档' }}</UBadge></td>
              <td class="col-num"><span class="metric"><UIcon name="i-lucide-eye" />{{ post.viewCount.toLocaleString('zh-CN') }}</span></td>
              <td class="cell-time">{{ formatDate(post.updatedAt) }}</td>
              <td class="cell-time">{{ formatDate(post.createdAt) }}</td>
              <td>
                <div class="row-actions">
                  <UButton :to="`/admin/posts/${post.id}/edit`" icon="i-lucide-pencil" color="neutral" variant="ghost" square size="xs" :aria-label="`编辑 ${post.title}`" />
                  <UButton icon="i-lucide-trash-2" color="error" variant="ghost" square size="xs" :aria-label="`删除 ${post.title}`" :loading="deletingId === post.id" :disabled="deletingId !== null" @click="remove(post)" />
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </section>

    <div v-if="total > 20" class="pagination"><UPagination v-model:page="page" :total="total" :items-per-page="20" /></div>
  </section>
</template>

<style scoped>
.posts-page { display: grid; gap: 12px; }

.panel { overflow: hidden; border: 1px solid var(--admin-border); border-radius: var(--admin-radius); background: var(--admin-surface); }

/* Pin the filter bar under the sticky topbar, and keep the column header on
   screen while the rows scroll inside the panel. */
.toolbar-panel {
  position: sticky;
  top: var(--admin-header-height);
  z-index: 6;
  padding: 12px 14px;
  box-shadow: 0 6px 12px -12px rgb(0 0 0 / 40%);
}
.toolbar { display: flex; align-items: center; gap: 10px; }
.search-input { width: min(100%, 360px); }
.status-select { width: 136px; }
.result-count { margin-left: auto; color: var(--admin-muted); font-size: 12px; white-space: nowrap; }

.table-scroll { width: 100%; overflow: auto; max-height: calc(100vh - var(--admin-header-height) - 220px); }
table { width: 100%; min-width: 1000px; table-layout: fixed; border-collapse: separate; border-spacing: 0; }
/* Fixed layout keeps the numeric columns at a stable width no matter how short the
   current titles are; the title column takes whatever is left. */
th:nth-child(1) { width: 64px; }
th:nth-child(2) { width: 72px; }
th:nth-child(3) { width: auto; }
th:nth-child(4) { width: 96px; }
th:nth-child(5) { width: 96px; }
th:nth-child(6) { width: 112px; }
th:nth-child(7) { width: 112px; }
th:nth-child(8) { width: 84px; }
thead th {
  position: sticky;
  top: 0;
  z-index: 2;
  background: var(--admin-surface);
  box-shadow: inset 0 -1px 0 var(--admin-border), 0 6px 8px -8px rgb(0 0 0 / 45%);
}
th { padding: 0 16px; border-bottom: 1px solid var(--admin-border); color: var(--admin-muted); font-size: 12px; font-weight: 600; text-align: left; white-space: nowrap; }
th:last-child { width: 76px; }
td { padding: 12px 16px; border-bottom: 1px solid var(--admin-border); color: var(--admin-body); font-size: 12px; vertical-align: middle; white-space: nowrap; }
.col-num { text-align: right; }
.col-index,
.col-id { text-align: right; color: var(--admin-muted); font-variant-numeric: tabular-nums; }
.col-num .th-sort { justify-content: flex-end; }
td.col-num .metric { width: 100%; justify-content: flex-end; }

.th-sort {
  display: inline-flex;
  width: 100%;
  align-items: center;
  gap: 4px;
  padding: 10px 0;
  border: 0;
  background: none;
  color: inherit;
  font: inherit;
  font-weight: 600;
  text-align: left;
  cursor: pointer;
  transition: color var(--admin-duration-fast) var(--admin-ease);
}
.th-sort:hover { color: var(--admin-text); }
.th-sort.is-active { color: var(--admin-text); }
.sort-icon { width: 12px; height: 12px; flex: none; opacity: .4; transition: opacity var(--admin-duration-fast) var(--admin-ease); }
.th-sort.is-active .sort-icon { color: var(--admin-accent-text); opacity: 1; }
tbody tr:last-child td { border-bottom: 0; }
tbody tr:hover { background: var(--admin-hover); }
td:first-child { width: 100%; white-space: normal; }
.cell-time { color: var(--admin-muted); }
.post-title { display: block; overflow: hidden; color: var(--admin-text); font-size: 14px; font-weight: 600; line-height: 1.4; text-decoration: none; text-overflow: ellipsis; }
.post-title:hover { color: var(--admin-accent-text); }
.post-tags { display: flex; flex-wrap: wrap; gap: 6px; margin-top: 6px; }
.post-tags span { color: var(--admin-faint); font-size: 12px; }
.metric { display: inline-flex; align-items: center; gap: 6px; font-variant-numeric: tabular-nums; }
.metric :deep(svg) { width: 14px; height: 14px; color: var(--admin-faint); }
.row-actions { display: flex; justify-content: flex-end; gap: 2px; }

.loading-list { display: grid; gap: 8px; padding: 14px; }
.empty-state { display: grid; min-height: 320px; place-items: center; align-content: center; gap: 10px; text-align: center; }
.empty-state>span { display: grid; width: 44px; height: 44px; margin-bottom: 4px; place-items: center; border: 1px solid var(--admin-border); border-radius: 10px; color: var(--admin-muted); }
.empty-state>span :deep(svg) { width: 20px; height: 20px; }
.empty-state strong { color: var(--admin-text); font-size: 14px; }
.empty-state p { margin: 0 0 6px; color: var(--admin-muted); font-size: 12px; }
.pagination { display: flex; justify-content: flex-end; }
.sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0, 0, 0, 0); }

@media (max-width: 640px) {
  .toolbar { flex-wrap: wrap; }
  .search-input { width: 100%; }
  .status-select { flex: 1; }
  .result-count { margin-left: 0; }
}
</style>
