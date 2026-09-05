<script setup lang="ts">
definePageMeta({ layout: 'admin' })
useSeoMeta({ title: '文章管理' })

type Post = { id: number; title: string; status: 'PUBLISHED' | 'ARCHIVED'; viewCount: number; publishedAt: string; updatedAt: string; tags: { id: number; name: string }[] }
const session = useState<{ csrfToken: string } | null>('admin-session')
const search = ref('')
const status = ref('')
const page = ref(1)
const statusItems = [
  { label: '全部状态', value: '' },
  { label: '已发布', value: 'PUBLISHED' },
  { label: '已归档', value: 'ARCHIVED' },
]
const query = computed(() => ({ page: page.value, pageSize: 20, q: search.value || undefined, status: status.value || undefined }))
const { data: response, pending, refresh } = await useFetch<{ data: { items: Post[]; total: number; pageSize: number } }>('/api/admin/posts', { query })
const posts = computed(() => response.value?.data.items || [])
const total = computed(() => response.value?.data.total || 0)
const formatDate = (value: string) => new Date(value).toLocaleDateString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit' })

watch([search, status], () => { page.value = 1 })

async function remove(post: Post) {
  if (!session.value || !window.confirm(`确定永久删除《${post.title}》吗？删除后无法恢复。`)) return
  await $fetch(`/api/admin/posts/${post.id}`, { method: 'DELETE', headers: { 'X-CSRF-Token': session.value.csrfToken } })
  await refresh()
}
</script>

<template>
  <section class="posts-page">
    <AdminPageHeader eyebrow="Content" title="文章管理" :description="`管理博客中的全部内容，共 ${total} 篇文章。`">
      <template #actions><UButton to="/admin/posts/new" icon="i-lucide-plus" size="sm">新建文章</UButton></template>
    </AdminPageHeader>

    <UCard class="toolbar-card">
      <div class="toolbar">
        <UInput v-model="search" icon="i-lucide-search" placeholder="搜索文章标题…" class="search-input" />
        <USelect v-model="status" :items="statusItems" value-key="value" class="status-select" />
        <span class="result-count">{{ total }} 条结果</span>
      </div>
    </UCard>

    <UCard class="table-card">
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
          <thead><tr><th>文章</th><th>状态</th><th>浏览量</th><th>更新时间</th><th><span class="sr-only">操作</span></th></tr></thead>
          <tbody>
            <tr v-for="post in posts" :key="post.id">
              <td>
                <NuxtLink :to="`/admin/posts/${post.id}/edit`" class="post-title">{{ post.title }}</NuxtLink>
                <div class="post-tags"><span v-for="tag in post.tags" :key="tag.id">{{ tag.name }}</span><span v-if="!post.tags.length">无标签</span></div>
              </td>
              <td><UBadge :color="post.status === 'PUBLISHED' ? 'success' : 'neutral'" variant="subtle" size="sm">{{ post.status === 'PUBLISHED' ? '已发布' : '已归档' }}</UBadge></td>
              <td><span class="metric"><UIcon name="i-lucide-eye" />{{ post.viewCount.toLocaleString('zh-CN') }}</span></td>
              <td>{{ formatDate(post.updatedAt) }}</td>
              <td>
                <div class="row-actions">
                  <UButton :to="`/admin/posts/${post.id}/edit`" icon="i-lucide-pencil" color="neutral" variant="ghost" square size="xs" :aria-label="`编辑 ${post.title}`" />
                  <UButton icon="i-lucide-trash-2" color="error" variant="ghost" square size="xs" :aria-label="`删除 ${post.title}`" @click="remove(post)" />
                </div>
              </td>
            </tr>
          </tbody>
        </table>
      </div>
    </UCard>

    <div v-if="total > 20" class="pagination"><UPagination v-model:page="page" :total="total" :items-per-page="20" /></div>
  </section>
</template>

<style scoped>
.posts-page { display: grid; gap: 22px; }
.toolbar-card { overflow: visible; }
.toolbar { display: flex; align-items: center; gap: 10px; }
.search-input { width: min(100%, 360px); }
.status-select { width: 132px; }
.result-count { margin-left: auto; color: var(--color-text-muted); font-size: 11.5px; white-space: nowrap; }
.table-card { overflow: hidden; }
.table-scroll { width: 100%; overflow-x: auto; }
table { width: 100%; min-width: 760px; border-collapse: collapse; }
th { padding: 0 14px 12px; color: var(--color-text-muted); font-size: 10.5px; font-weight: 600; text-align: left; }
th:last-child { width: 76px; }
td { padding: 15px 14px; border-top: 1px solid var(--color-border); color: var(--color-text-secondary); font-size: 11.5px; vertical-align: middle; white-space: nowrap; }
td:first-child { width: 100%; white-space: normal; }
.post-title { color: var(--color-text); font-size: 13px; font-weight: 620; line-height: 1.4; }
.post-title:hover { color: var(--color-primary); }
.post-tags { display: flex; flex-wrap: wrap; gap: 5px; margin-top: 6px; }
.post-tags span { color: var(--color-text-muted); font-size: 10.5px; }
.metric { display: inline-flex; align-items: center; gap: 6px; }
.metric :deep(svg) { width: 13px; height: 13px; }
.row-actions { display: flex; justify-content: flex-end; gap: 2px; }
.loading-list { display: grid; gap: 8px; padding: 6px 0; }
.empty-state { display: grid; min-height: 360px; place-items: center; align-content: center; gap: 9px; text-align: center; }
.empty-state>span { display: grid; width: 46px; height: 46px; margin-bottom: 4px; place-items: center; border-radius: 12px; background: var(--color-background-secondary); color: var(--color-text-muted); }
.empty-state>span :deep(svg) { width: 21px; height: 21px; }
.empty-state strong { font-size: 13px; }
.empty-state p { margin: 0 0 5px; color: var(--color-text-muted); font-size: 11.5px; }
.pagination { display: flex; justify-content: flex-end; }
.sr-only { position: absolute; width: 1px; height: 1px; overflow: hidden; clip: rect(0, 0, 0, 0); }

@media (max-width: 640px) {
  .toolbar { flex-wrap: wrap; }
  .search-input { width: 100%; }
  .status-select { flex: 1; }
  .result-count { margin-left: 0; }
}
</style>
