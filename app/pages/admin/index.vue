<script setup lang="ts">
definePageMeta({ layout: 'admin' })
useSeoMeta({ title: '仪表盘' })

type OverviewPost = { id: number; title: string; viewCount?: number; updatedAt?: string; status?: 'PUBLISHED' | 'ARCHIVED' }
type Overview = { totalPosts: number; publishedPosts: number; totalViews: number; topPosts: OverviewPost[]; recentPosts: OverviewPost[] }

const session = useState<{ user: { username: string } } | null>('admin-session')
const { data: response } = await useFetch<{ data: Overview }>('/api/admin/analytics/overview')
const data = computed<Overview>(() => response.value?.data || { totalPosts: 0, publishedPosts: 0, totalViews: 0, topPosts: [], recentPosts: [] })
const displayName = computed(() => session.value?.user.username || 'Carreyda')
const formatNumber = (value: number) => new Intl.NumberFormat('zh-CN').format(value)
const formatDate = (value?: string) => value ? new Date(value).toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit' }) : '—'
</script>

<template>
  <section class="dashboard-page">
    <AdminPageHeader :title="`欢迎回来，${displayName}`" description="管理内容，追踪博客表现。">
      <template #actions>
        <UButton to="/" target="_blank" color="neutral" variant="outline" icon="i-lucide-external-link" size="sm">查看博客</UButton>
      </template>
    </AdminPageHeader>

    <div class="stats-grid">
      <AdminStatCard label="文章总数" :value="formatNumber(data.totalPosts)" icon="i-lucide-files" caption="全部文章内容" tone="primary" />
      <AdminStatCard label="已发布" :value="formatNumber(data.publishedPosts)" icon="i-lucide-circle-check" caption="当前公开可见" tone="success" />
      <AdminStatCard label="总访问量" :value="formatNumber(data.totalViews)" icon="i-lucide-chart-no-axes-column-increasing" caption="全站累计浏览" tone="primary" />
    </div>

    <div class="dashboard-grid">
      <UCard class="content-card popular-card">
        <template #header>
          <div class="card-heading">
            <div><strong>热门文章</strong><p>按累计浏览量排序</p></div>
            <UButton to="/admin/posts" color="neutral" variant="ghost" trailing-icon="i-lucide-arrow-right" size="xs">查看全部</UButton>
          </div>
        </template>

        <div v-if="data.topPosts.length" class="table-wrap">
          <table>
            <thead><tr><th>文章标题</th><th>状态</th><th>访问量</th><th>操作</th></tr></thead>
            <tbody>
              <tr v-for="post in data.topPosts" :key="post.id">
                <td><NuxtLink :to="`/admin/posts/${post.id}/edit`">{{ post.title }}</NuxtLink></td>
                <td><UBadge color="success" variant="subtle" size="sm">已发布</UBadge></td>
                <td>{{ formatNumber(post.viewCount || 0) }}</td>
                <td><UButton :to="`/admin/posts/${post.id}/edit`" icon="i-lucide-arrow-up-right" color="neutral" variant="ghost" square size="xs" :aria-label="`编辑 ${post.title}`" /></td>
              </tr>
            </tbody>
          </table>
        </div>
        <div v-else class="empty-state"><UIcon name="i-lucide-file-text" /><p>还没有文章数据</p><UButton to="/admin/posts/new" size="sm">创建第一篇文章</UButton></div>
      </UCard>

      <UCard class="content-card recent-card">
        <template #header>
          <div class="card-heading">
            <div><strong>最近编辑</strong><p>最近更新的内容</p></div>
            <UButton to="/admin/posts" color="neutral" variant="ghost" icon="i-lucide-ellipsis" square size="xs" aria-label="查看全部文章" />
          </div>
        </template>

        <div v-if="data.recentPosts.length" class="recent-list">
          <NuxtLink v-for="post in data.recentPosts" :key="post.id" :to="`/admin/posts/${post.id}/edit`" class="recent-item">
            <span class="recent-icon"><UIcon name="i-lucide-file-text" /></span>
            <span><strong>{{ post.title }}</strong><small>{{ formatDate(post.updatedAt) }}</small></span>
            <UIcon name="i-lucide-chevron-right" />
          </NuxtLink>
        </div>
        <div v-else class="empty-state compact"><p>暂无最近编辑</p></div>
      </UCard>
    </div>
  </section>
</template>

<style scoped>
.dashboard-page { display: grid; gap: 28px; }
.stats-grid { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 16px; }
.dashboard-grid { display: grid; grid-template-columns: minmax(0, 1.7fr) minmax(280px, .8fr); gap: 16px; align-items: start; }
.content-card { overflow: hidden; }
.card-heading { display: flex; align-items: center; justify-content: space-between; gap: 16px; }
.card-heading strong { display: block; font-size: 14px; font-weight: 680; }
.card-heading p { margin: 4px 0 0; color: var(--color-text-muted); font-size: 11px; }
.table-wrap { width: 100%; overflow-x: auto; }
table { width: 100%; border-collapse: collapse; font-size: 12px; }
th { padding: 0 12px 11px; color: var(--color-text-muted); font-size: 10.5px; font-weight: 600; text-align: left; }
td { padding: 14px 12px; border-top: 1px solid var(--color-border); color: var(--color-text-secondary); white-space: nowrap; }
td:first-child { width: 100%; color: var(--color-text); font-size: 12.5px; font-weight: 580; white-space: normal; }
td:last-child { text-align: right; }
.recent-list { display: grid; }
.recent-item { display: grid; min-width: 0; grid-template-columns: 34px minmax(0, 1fr) 16px; align-items: center; gap: 10px; padding: 12px 0; border-bottom: 1px solid var(--color-border); }
.recent-item:last-child { border-bottom: 0; }
.recent-item:hover strong { color: var(--color-primary); }
.recent-icon { display: grid; width: 34px; height: 34px; place-items: center; border: 1px solid var(--color-border); border-radius: 8px; color: var(--color-text-secondary); }
.recent-icon :deep(svg) { width: 15px; height: 15px; }
.recent-item>span:nth-child(2) { display: grid; min-width: 0; gap: 4px; }
.recent-item strong { overflow: hidden; font-size: 12px; font-weight: 580; text-overflow: ellipsis; white-space: nowrap; transition: color .15s ease; }
.recent-item small { color: var(--color-text-muted); font-size: 10.5px; }
.recent-item>svg { width: 14px; color: var(--color-text-muted); }
.empty-state { display: grid; min-height: 240px; place-items: center; align-content: center; gap: 10px; color: var(--color-text-muted); text-align: center; }
.empty-state.compact { min-height: 140px; }
.empty-state>svg { width: 24px; height: 24px; }
.empty-state p { margin: 0; font-size: 12px; }

@media (max-width: 1120px) { .dashboard-grid { grid-template-columns: 1fr; } }
@media (max-width: 760px) { .stats-grid { grid-template-columns: 1fr; } }
</style>
