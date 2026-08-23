<script setup lang="ts">
definePageMeta({ layout: 'admin' })

type Post = { id: number; title: string; status: 'PUBLISHED' | 'ARCHIVED'; viewCount: number; publishedAt: string; updatedAt: string; tags: { id: number; name: string }[] }
const session = useState<{ csrfToken: string } | null>('admin-session')
const search = ref('')
const status = ref('')
const page = ref(1)
const query = computed(() => ({ page: page.value, pageSize: 20, q: search.value || undefined, status: status.value || undefined }))
const { data: response, pending, refresh } = await useFetch<{ data: { items: Post[]; total: number; pageSize: number } }>('/api/admin/posts', { query })
const posts = computed(() => response.value?.data.items || [])
const total = computed(() => response.value?.data.total || 0)

async function remove(post: Post) {
  if (!session.value || !window.confirm(`确定永久删除《${post.title}》吗？删除后无法恢复。`)) return
  await $fetch(`/api/admin/posts/${post.id}`, { method: 'DELETE', headers: { 'X-CSRF-Token': session.value.csrfToken } })
  await refresh()
}
</script>

<template>
  <section class="admin-page">
    <header class="page-header"><div><p class="eyebrow">CONTENT</p><h1>文章管理</h1></div><UButton to="/admin/posts/new">新建文章</UButton></header>
    <div class="filters">
      <UInput v-model="search" placeholder="按标题搜索" icon="i-lucide-search" />
      <select v-model="status"><option value="">全部状态</option><option value="PUBLISHED">已发布</option><option value="ARCHIVED">已归档</option></select>
    </div>
    <UCard>
      <div v-if="pending" class="empty">加载中…</div>
      <div v-else-if="!posts.length" class="empty">暂无文章</div>
      <div v-else class="post-table">
        <div v-for="post in posts" :key="post.id" class="post-row">
          <div><NuxtLink :to="`/admin/posts/${post.id}/edit`" class="post-title">{{ post.title }}</NuxtLink><p>{{ post.tags.map(tag => tag.name).join(' · ') || '无标签' }}</p></div>
          <span :class="['status', post.status.toLowerCase()]">{{ post.status === 'PUBLISHED' ? '已发布' : '已归档' }}</span>
          <span>{{ post.viewCount }} 次浏览</span>
          <span>{{ new Date(post.updatedAt).toLocaleDateString('zh-CN') }}</span>
          <div class="actions"><UButton :to="`/admin/posts/${post.id}/edit`" size="sm" color="neutral" variant="ghost">编辑</UButton><UButton size="sm" color="error" variant="ghost" @click="remove(post)">删除</UButton></div>
        </div>
      </div>
    </UCard>
    <UPagination v-if="total > 20" v-model:page="page" :total="total" :items-per-page="20" />
  </section>
</template>

<style scoped>
.admin-page { display: grid; gap: 22px; }.page-header { display: flex; align-items: end; justify-content: space-between; }.page-header h1 { margin: 0; }.filters { display: flex; gap: 12px; }.filters select { min-width: 130px; padding: 7px 10px; border: 1px solid var(--color-border); border-radius: 6px; background: var(--color-background); color: inherit; }.post-table { display: grid; }.post-row { display: grid; grid-template-columns: minmax(220px, 1fr) 80px 100px 110px 120px; gap: 16px; align-items: center; padding: 15px 0; border-bottom: 1px solid var(--color-border); font-size: 12px; color: var(--color-text-secondary); }.post-row:last-child { border: 0; }.post-title { color: var(--color-text); font-size: 14px; font-weight: 650; }.post-row p { margin: 5px 0 0; }.status { width: fit-content; padding: 3px 7px; border-radius: 99px; }.published { color: #238636; background: #23863618; }.archived { background: var(--color-background-secondary); }.actions { display: flex; }.empty { padding: 40px; text-align: center; color: var(--color-text-secondary); }@media(max-width:900px){.post-row{grid-template-columns:1fr auto}.post-row>span{display:none}}
</style>
