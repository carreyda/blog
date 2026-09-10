<script setup lang="ts">
definePageMeta({ layout: 'admin' })
useSeoMeta({ title: '仪表盘' })

type OverviewPost = { id: number; title: string; viewCount?: number; updatedAt?: string; status?: 'PUBLISHED' | 'ARCHIVED' }
type Overview = { totalPosts: number; publishedPosts: number; totalViews: number; topPosts: OverviewPost[]; recentPosts: OverviewPost[] }

const session = useState<{ user: { username: string } } | null>('admin-session')
const { data: response } = await useFetch<{ data: Overview }>('/api/admin/analytics/overview')
const data = computed<Overview>(() => response.value?.data || { totalPosts: 0, publishedPosts: 0, totalViews: 0, topPosts: [], recentPosts: [] })
const displayName = computed(() => session.value?.user.username || 'Carreyda')
const hour = Number(new Intl.DateTimeFormat('zh-CN', { hour: '2-digit', hour12: false, timeZone: 'Asia/Shanghai' }).format(new Date()))
const greeting = hour < 6 ? '夜深了' : hour < 12 ? '上午好' : hour < 18 ? '下午好' : '晚上好'
const formatNumber = (value: number) => new Intl.NumberFormat('zh-CN').format(value)
const formatDate = (value?: string) => value ? new Date(value).toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }) : '—'
const formatRecentDate = (value?: string) => {
  if (!value) return '—'
  const date = new Date(value)
  const today = new Date()
  const time = date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false })
  if (date.toDateString() === today.toDateString()) return time
  const yesterday = new Date(today)
  yesterday.setDate(today.getDate() - 1)
  if (date.toDateString() === yesterday.toDateString()) return `昨天 ${time}`
  return date.toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false })
}
</script>

<template>
  <section class="dashboard-page">
    <AdminPageHeader class="dashboard-header" :title="`${greeting}，${displayName}`" description="管理内容，追踪博客表现。" />

    <div class="stats-grid">
      <AdminStatCard label="文章总数" :value="formatNumber(data.totalPosts)" icon="i-lucide-notebook-text" caption="文章总数趋势" tone="primary" chart="one" />
      <AdminStatCard label="已发布" :value="formatNumber(data.publishedPosts)" icon="i-lucide-circle-check" caption="发布文章趋势" tone="success" chart="two" />
      <AdminStatCard label="总访问量" :value="formatNumber(data.totalViews)" icon="i-lucide-chart-no-axes-column-increasing" caption="访问量趋势" tone="primary" chart="three" />
    </div>

    <div class="dashboard-grid">
      <UCard class="dashboard-card popular-card" :ui="{ header: 'px-7 py-6 sm:px-7', body: 'px-7 pt-0 pb-0 sm:px-7 sm:pt-0 sm:pb-0', footer: 'px-7 py-4 sm:px-7' }">
        <template #header>
          <div class="card-heading"><strong>热门文章</strong><UButton to="/admin/posts" variant="link" size="sm" trailing-icon="i-lucide-arrow-right">查看全部</UButton></div>
        </template>
        <div v-if="data.topPosts.length" class="table-wrap">
          <table>
            <thead><tr><th>文章标题</th><th>状态</th><th>访问量</th><th>更新时间</th></tr></thead>
            <tbody>
              <tr v-for="post in data.topPosts.slice(0, 5)" :key="post.id">
                <td><NuxtLink :to="`/admin/posts/${post.id}/edit`">{{ post.title }}</NuxtLink></td>
                <td><UBadge :color="post.status === 'ARCHIVED' ? 'neutral' : 'success'" variant="subtle" size="sm">{{ post.status === 'ARCHIVED' ? '已归档' : '已发布' }}</UBadge></td>
                <td>{{ formatNumber(post.viewCount || 0) }}</td>
                <td>{{ formatDate(post.updatedAt) }}</td>
              </tr>
            </tbody>
          </table>
        </div>
        <div v-else class="empty-state"><UIcon name="i-lucide-file-text" /><p>还没有文章数据</p><UButton to="/admin/posts/new" size="sm">创建第一篇文章</UButton></div>
        <template #footer><NuxtLink to="/admin/posts" class="card-footer-link">查看全部</NuxtLink></template>
      </UCard>

      <UCard class="dashboard-card recent-card" :ui="{ header: 'px-7 py-6 sm:px-7', body: 'px-7 pt-0 pb-0 sm:px-7 sm:pt-0 sm:pb-0' }">
        <template #header><div class="card-heading"><strong>最近编辑</strong><UButton to="/admin/posts" variant="link" size="sm" trailing-icon="i-lucide-arrow-right">查看全部</UButton></div></template>
        <div v-if="data.recentPosts.length" class="recent-list">
          <NuxtLink v-for="post in data.recentPosts.slice(0, 5)" :key="post.id" :to="`/admin/posts/${post.id}/edit`" class="recent-item">
            <span class="recent-icon"><UIcon name="i-lucide-file-text" /></span>
            <strong>{{ post.title }}</strong>
            <time>{{ formatRecentDate(post.updatedAt) }}</time>
          </NuxtLink>
        </div>
        <div v-else class="empty-state compact"><p>暂无最近编辑</p></div>
      </UCard>
    </div>
  </section>
</template>

<style scoped>
.dashboard-page{display:grid;gap:28px}.dashboard-header{margin:2px 0 3px}.dashboard-header :deep(h1){font-size:36px;font-weight:650;letter-spacing:-.045em}.dashboard-header :deep(.admin-description){margin-top:10px;font-size:15px}.stats-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:20px}.dashboard-grid{display:grid;grid-template-columns:minmax(0,1.95fr) minmax(330px,.78fr);gap:20px;align-items:stretch}.dashboard-card{min-height:474px;border-color:var(--admin-border,var(--color-border));box-shadow:none}.card-heading{display:flex;align-items:center;justify-content:space-between;gap:16px}.card-heading strong{font-size:16px;font-weight:650}.table-wrap{width:100%;overflow-x:auto}table{width:100%;border-collapse:collapse;font-size:13px}th{padding:0 7px 13px;color:var(--color-text-secondary);font-size:12px;font-weight:450;text-align:left}td{height:61px;padding:0 7px;border-top:1px solid var(--admin-border,var(--color-border));color:var(--color-text);white-space:nowrap}td:first-child{width:100%;font-weight:500;white-space:normal}td:first-child a:hover{color:var(--color-primary)}td:nth-child(2){min-width:100px}td:nth-child(3){min-width:105px}td:last-child{min-width:170px;color:var(--color-text-secondary)}.card-footer-link{display:block;color:var(--color-primary);font-size:13px;text-align:center}.recent-list{display:grid}.recent-item{display:grid;min-width:0;grid-template-columns:40px minmax(0,1fr) auto;align-items:center;gap:12px;min-height:73px;border-top:1px solid var(--admin-border,var(--color-border))}.recent-item:hover strong{color:var(--color-primary)}.recent-icon{display:grid;width:38px;height:38px;place-items:center;border:1px solid var(--admin-border,var(--color-border));border-radius:7px;color:var(--color-text-secondary)}.recent-icon :deep(svg){width:17px;height:17px}.recent-item strong{overflow:hidden;font-size:13px;font-weight:500;text-overflow:ellipsis;white-space:nowrap;transition:color .15s ease}.recent-item time{color:var(--color-text-secondary);font-size:11.5px;white-space:nowrap}.empty-state{display:grid;min-height:315px;place-items:center;align-content:center;gap:10px;color:var(--color-text-muted);text-align:center}.empty-state.compact{min-height:320px}.empty-state>svg{width:24px;height:24px}.empty-state p{margin:0;font-size:12px}@media(max-width:1180px){.dashboard-grid{grid-template-columns:1fr}.recent-card{min-height:auto}}@media(max-width:900px){.stats-grid{grid-template-columns:1fr}.dashboard-header :deep(h1){font-size:30px}}@media(max-width:640px){.dashboard-page{gap:20px}.dashboard-grid,.stats-grid{gap:14px}td:last-child{min-width:150px}}
</style>
