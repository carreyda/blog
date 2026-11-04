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

const drafts = computed(() => Math.max(0, data.value.totalPosts - data.value.publishedPosts))
const publishRate = computed(() => (data.value.totalPosts ? Math.round((data.value.publishedPosts / data.value.totalPosts) * 100) : 0))
const draftRate = computed(() => (data.value.totalPosts ? Math.round((drafts.value / data.value.totalPosts) * 100) : 0))
const avgViews = computed(() => (data.value.totalPosts ? Math.round(data.value.totalViews / data.value.totalPosts) : 0))
const topFiveViews = computed(() => data.value.topPosts.slice(0, 5).reduce((sum, post) => sum + (post.viewCount || 0), 0))
const topFiveShare = computed(() => (data.value.totalViews ? Math.round((topFiveViews.value / data.value.totalViews) * 100) : 0))

const formatNumber = (value: number) => new Intl.NumberFormat('zh-CN').format(value)
const formatDate = (value?: string) =>
  value ? new Date(value).toLocaleString('zh-CN', { year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false }) : '—'

const formatRecentDate = (value?: string) => {
  if (!value) return '—'
  const date = new Date(value)
  const today = new Date()
  const time = date.toLocaleTimeString('zh-CN', { hour: '2-digit', minute: '2-digit', hour12: false })
  if (date.toDateString() === today.toDateString()) return `今天 ${time}`
  const yesterday = new Date(today)
  yesterday.setDate(today.getDate() - 1)
  if (date.toDateString() === yesterday.toDateString()) return `昨天 ${time}`
  return date.toLocaleString('zh-CN', { month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hour12: false })
}

const lastUpdatedCaption = computed(() => {
  const latest = data.value.recentPosts[0]?.updatedAt
  return latest ? `最近更新于 ${formatRecentDate(latest)}` : '还没有更新记录'
})

/* Countdown chips in the header. Fixed-date festivals are computed from today; the
   Spring Festival follows the lunar calendar, so its dates are pinned per year
   instead of being guessed (a missing year simply drops out of the list). */
const SPRING_FESTIVAL: Record<number, [number, number]> = {
  2026: [2, 17],
  2027: [2, 6],
  2028: [1, 26],
  2029: [2, 13],
  2030: [2, 3],
  2031: [1, 23],
}

const dayStart = (date: Date) => new Date(date.getFullYear(), date.getMonth(), date.getDate())

const festivals = computed(() => {
  const today = dayStart(new Date())
  const year = today.getFullYear()
  const items: { name: string; days: number }[] = []

  const push = (name: string, month: number, day: number, fromYear: number) => {
    const target = dayStart(new Date(fromYear, month - 1, day))
    items.push({ name, days: Math.round((target.getTime() - today.getTime()) / 86400000) })
  }

  for (const [name, month, day] of [['元旦', 1, 1], ['五一', 5, 1], ['十一', 10, 1]] as const) {
    const passed = dayStart(new Date(year, month - 1, day)) < today
    push(name, month, day, passed ? year + 1 : year)
  }

  for (const [fromYear] of [[year], [year + 1]] as const) {
    const spring = SPRING_FESTIVAL[fromYear]
    if (!spring) continue
    if (dayStart(new Date(fromYear, spring[0] - 1, spring[1])) >= today) {
      push('春节', spring[0], spring[1], fromYear)
      break
    }
  }

  return items
    .sort((a, b) => a.days - b.days)
    .map(item => ({
      ...item,
      label: item.days === 0 ? `今天就是${item.name}` : `距离${item.name} ${item.days} 天`,
    }))
})

/* Live clock: week / month / year progress all roll over at midnight, but the
   bars advance with the seconds so the panel never looks stale. */
const now = ref(new Date())
const mounted = ref(false)
let clockTimer: ReturnType<typeof setInterval> | undefined

onMounted(() => {
  mounted.value = true
  now.value = new Date()
  clockTimer = setInterval(() => { now.value = new Date() }, 1000)
})

onBeforeUnmount(() => {
  if (clockTimer) clearInterval(clockTimer)
})

const clockText = computed(() => now.value.toLocaleTimeString('zh-CN', { hour12: false }))

const timeProgress = computed(() => {
  const date = now.value
  const dayFraction = (date.getHours() * 3600 + date.getMinutes() * 60 + date.getSeconds()) / 86400
  const mondayIndex = (date.getDay() + 6) % 7
  const monthDays = new Date(date.getFullYear(), date.getMonth() + 1, 0).getDate()
  const yearStart = new Date(date.getFullYear(), 0, 1)
  const yearDays = Math.round((new Date(date.getFullYear() + 1, 0, 1).getTime() - yearStart.getTime()) / 86400000)
  const dayOfYear = Math.floor((date.getTime() - yearStart.getTime()) / 86400000)

  const build = (label: string, elapsed: number, total: number) => ({
    label,
    left: total - elapsed,
    percent: Math.min(100, Math.max(0, ((elapsed - 1 + dayFraction) / total) * 100)),
    note: `已过 ${elapsed} / ${total} 天`,
  })

  return [
    build('本周还剩', mondayIndex + 1, 7),
    build('本月还剩', date.getDate(), monthDays),
    build('本年还剩', dayOfYear + 1, yearDays),
  ]
})

/* The analytics endpoint has no per-day series, so the trend panel renders a
   shape scaled to real traffic and is badged as 演示数据 instead of faking a feed. */
const DEMO_WEIGHTS = [0.72, 0.88, 0.66, 1.06, 1.34, 1.18, 1.46]
const demoSeries = computed(() => {
  const base = Math.max(6, Math.round((data.value.totalViews || 0) / 26))
  return DEMO_WEIGHTS.map(weight => Math.max(2, Math.round(base * weight)))
})

const WEEKDAYS = ['周一', '周二', '周三', '周四', '周五', '周六', '周日']

function niceStep(value: number) {
  if (value <= 1) return 1
  const magnitude = 10 ** Math.floor(Math.log10(value))
  const normalized = value / magnitude
  const step = normalized <= 1 ? 1 : normalized <= 2 ? 2 : normalized <= 5 ? 5 : 10
  return step * magnitude
}

const chart = computed(() => {
  const width = 720
  const height = 232
  const left = 44
  const right = 10
  const top = 16
  const bottom = 28

  const series = demoSeries.value
  const unit = niceStep(Math.max(...series) / 3)
  const scaleMax = unit * 3
  const innerWidth = width - left - right
  const innerHeight = height - top - bottom
  const stepX = innerWidth / Math.max(1, series.length - 1)

  const points = series.map((value, index) => ({
    value,
    x: Math.round((left + index * stepX) * 10) / 10,
    y: Math.round((top + innerHeight - (value / scaleMax) * innerHeight) * 10) / 10,
  }))

  const first = points[0]
  const last = points[points.length - 1]
  const line = first && last
    ? `M ${first.x} ${first.y} ` + points.slice(1).map((point, index) => {
        const previous = points[index] ?? point
        const midX = Math.round(((previous.x + point.x) / 2) * 10) / 10
        return `C ${midX} ${previous.y}, ${midX} ${point.y}, ${point.x} ${point.y}`
      }).join(' ')
    : ''

  const baseline = top + innerHeight
  const area = first && last ? `${line} L ${last.x} ${baseline} L ${first.x} ${baseline} Z` : ''
  const ticks = [0, 1, 2, 3].map(index => ({
    value: unit * index,
    y: Math.round((top + innerHeight - (index / 3) * innerHeight) * 10) / 10,
  }))

  return { width, height, left, right, top, bottom, points, line, area, ticks, baseline, innerWidth }
})
</script>

<template>
  <section class="dash">
    <header class="dash-head">
      <div>
        <h1>{{ greeting }}，{{ displayName }}</h1>
        <p>{{ drafts ? `${drafts} 篇草稿待完成，` : '' }}{{ lastUpdatedCaption }}。</p>
        <ul class="dash-hints">
          <li v-for="(item, index) in festivals" :key="item.name" class="hint-chip" :class="{ 'is-next': index === 0 }">
            {{ item.label }}
          </li>
        </ul>
      </div>
    </header>

    <div class="metrics">
      <article class="metric">
        <div class="metric-top">
          <div class="metric-labels">
            <span class="metric-eyebrow">内容</span>
            <span class="metric-title">文章总数</span>
          </div>
          <span class="metric-icon"><UIcon name="i-lucide-notebook-text" /></span>
        </div>
        <strong class="metric-value">{{ formatNumber(data.totalPosts) }}</strong>
        <p class="metric-meta">
          <span class="trend trend--up">↗ {{ publishRate }}%</span> 已发布 {{ formatNumber(data.publishedPosts) }} 篇
        </p>
      </article>

      <article class="metric">
        <div class="metric-top">
          <div class="metric-labels">
            <span class="metric-eyebrow">发布</span>
            <span class="metric-title">已发布</span>
          </div>
          <span class="metric-icon"><UIcon name="i-lucide-circle-check-big" /></span>
        </div>
        <strong class="metric-value">{{ formatNumber(data.publishedPosts) }}</strong>
        <p class="metric-meta"><span class="trend trend--up">↗ {{ publishRate }}%</span> 发布率</p>
      </article>

      <article class="metric">
        <div class="metric-top">
          <div class="metric-labels">
            <span class="metric-eyebrow">待办</span>
            <span class="metric-title">草稿</span>
          </div>
          <span class="metric-icon metric-icon--warn"><UIcon name="i-lucide-pencil-line" /></span>
        </div>
        <strong class="metric-value">{{ formatNumber(drafts) }}</strong>
        <p class="metric-meta">{{ drafts ? '待补充完善后发布' : '没有待完成的草稿' }}</p>
      </article>

      <article class="metric">
        <div class="metric-top">
          <div class="metric-labels">
            <span class="metric-eyebrow">流量</span>
            <span class="metric-title">总访问量</span>
          </div>
          <span class="metric-icon"><UIcon name="i-lucide-eye" /></span>
        </div>
        <strong class="metric-value">{{ formatNumber(data.totalViews) }}</strong>
        <p class="metric-meta">篇均 {{ formatNumber(avgViews) }} 次浏览</p>
      </article>
    </div>

    <div class="lower">
      <section class="panel trend-panel">
        <header class="panel-head">
          <span class="panel-icon"><UIcon name="i-lucide-chart-area" /></span>
          <div class="panel-titles">
            <h2>访问趋势</h2>
            <p>近 7 天 · 每日页面浏览量</p>
          </div>
          <span class="chip chip--muted">
            <UIcon name="i-lucide-sparkles" />
            演示数据
          </span>
        </header>
        <div class="chart-body">
          <svg class="chart" :viewBox="`0 0 ${chart.width} ${chart.height}`" preserveAspectRatio="none" role="img" aria-label="近 7 天访问趋势（演示数据）">
            <defs>
              <linearGradient id="trend-fill" x1="0" y1="0" x2="0" y2="1">
                <stop offset="0%" stop-color="var(--admin-accent)" stop-opacity=".26" />
                <stop offset="100%" stop-color="var(--admin-accent)" stop-opacity="0" />
              </linearGradient>
            </defs>
            <g class="chart-grid">
              <line v-for="tick in chart.ticks" :key="tick.value" :x1="chart.left" :x2="chart.width - chart.right" :y1="tick.y" :y2="tick.y" />
            </g>
            <g class="chart-axis">
              <text v-for="tick in chart.ticks" :key="`label-${tick.value}`" :x="chart.left - 10" :y="tick.y + 3" text-anchor="end">{{ formatNumber(tick.value) }}</text>
              <text v-for="(day, index) in WEEKDAYS" :key="day" :x="chart.points[index]?.x" :y="chart.height - 8" text-anchor="middle">{{ day }}</text>
            </g>
            <path :d="chart.area" fill="url(#trend-fill)" />
            <path :d="chart.line" class="chart-line" />
            <circle v-for="point in chart.points" :key="point.x" :cx="point.x" :cy="point.y" r="3" class="chart-dot" />
          </svg>
        </div>
      </section>

      <section class="panel feed-panel">
        <header class="panel-head">
          <span class="panel-icon"><UIcon name="i-lucide-pencil" /></span>
          <div class="panel-titles">
            <h2>最近编辑</h2>
            <p>按更新时间排序</p>
          </div>
          <NuxtLink to="/admin/posts" class="panel-link">全部</NuxtLink>
        </header>
        <ul v-if="data.recentPosts.length" class="feed">
          <li v-for="post in data.recentPosts.slice(0, 5)" :key="post.id">
            <NuxtLink :to="`/admin/posts/${post.id}/edit`" class="feed-item">
              <span class="feed-icon"><UIcon name="i-lucide-file-text" /></span>
              <span class="feed-title">{{ post.title }}</span>
              <time>{{ formatRecentDate(post.updatedAt) }}</time>
            </NuxtLink>
          </li>
        </ul>
        <p v-else class="panel-empty">还没有编辑记录</p>
      </section>
    </div>

    <section class="panel table-panel">
      <header class="panel-head">
        <span class="panel-icon"><UIcon name="i-lucide-eye" /></span>
        <div class="panel-titles">
          <h2>热门文章</h2>
          <p>按累计访问量排序</p>
        </div>
        <NuxtLink to="/admin/posts" class="panel-link">查看全部</NuxtLink>
      </header>
      <div v-if="data.topPosts.length" class="table-wrap">
        <table>
          <thead>
            <tr><th>文章标题</th><th>状态</th><th class="num">访问量</th><th>更新时间</th></tr>
          </thead>
          <tbody>
            <tr v-for="post in data.topPosts.slice(0, 5)" :key="post.id">
              <td class="cell-title"><NuxtLink :to="`/admin/posts/${post.id}/edit`">{{ post.title }}</NuxtLink></td>
              <td><UBadge :color="post.status === 'ARCHIVED' ? 'neutral' : 'success'" variant="subtle" size="sm">{{ post.status === 'ARCHIVED' ? '已归档' : '已发布' }}</UBadge></td>
              <td class="num">{{ formatNumber(post.viewCount || 0) }}</td>
              <td class="cell-time">{{ formatDate(post.updatedAt) }}</td>
            </tr>
          </tbody>
        </table>
      </div>
      <div v-else class="panel-empty">
        <p>还没有文章数据</p>
        <NuxtLink to="/admin/posts/new" class="btn-inline">创建第一篇文章</NuxtLink>
      </div>
    </section>

    <section class="panel bars-panel">
      <header class="panel-head">
        <span class="panel-icon"><UIcon name="i-lucide-activity" /></span>
        <div class="panel-titles">
          <h2>内容构成</h2>
          <p>发布与流量结构，全部由现有数据算出</p>
        </div>
      </header>
      <div class="bars">
        <div class="bar-row">
          <div class="bar-head"><span>发布率</span><strong>{{ publishRate }}%</strong></div>
          <div class="bar-track"><span class="bar-fill" :style="{ width: `${publishRate}%` }" /></div>
          <p class="bar-note">{{ formatNumber(data.publishedPosts) }} / {{ formatNumber(data.totalPosts) }} 篇已上线</p>
        </div>
        <div class="bar-row">
          <div class="bar-head"><span>草稿占比</span><strong>{{ draftRate }}%</strong></div>
          <div class="bar-track"><span class="bar-fill bar-fill--warn" :style="{ width: `${draftRate}%` }" /></div>
          <p class="bar-note">{{ formatNumber(drafts) }} 篇待完成</p>
        </div>
        <div class="bar-row">
          <div class="bar-head"><span>Top 5 流量占比</span><strong>{{ topFiveShare }}%</strong></div>
          <div class="bar-track"><span class="bar-fill" :style="{ width: `${topFiveShare}%` }" /></div>
          <p class="bar-note">{{ formatNumber(topFiveViews) }} / {{ formatNumber(data.totalViews) }} 次</p>
        </div>
      </div>
    </section>

    <section v-if="mounted" class="panel bars-panel">
      <header class="panel-head">
        <span class="panel-icon"><UIcon name="i-lucide-clock" /></span>
        <div class="panel-titles">
          <h2>时间进度</h2>
          <p>本周、本月、本年走过的比例</p>
        </div>
        <time class="panel-clock">{{ clockText }}</time>
      </header>
      <div class="bars">
        <div v-for="item in timeProgress" :key="item.label" class="bar-row">
          <div class="bar-head">
            <span>{{ item.label }}</span>
            <strong>{{ item.left }} 天</strong>
          </div>
          <div class="bar-track"><span class="bar-fill" :style="{ width: `${item.percent}%` }" /></div>
          <p class="bar-note">{{ item.note }}</p>
        </div>
      </div>
    </section>
  </section>
</template>

<style scoped>
.dash { display: grid; gap: 12px; }

.dash-head { padding: 4px 2px 6px; }
.dash-head h1 { margin: 0; color: var(--admin-text); font-size: 20px; font-weight: 680; letter-spacing: -.02em; }
.dash-head p { margin: 6px 0 0; color: var(--admin-muted); font-size: 12px; }

.dash-hints { display: flex; flex-wrap: wrap; gap: 6px; margin: 8px 0 0; padding: 0; list-style: none; }
.hint-chip {
  padding: 2px 8px;
  border: 1px solid var(--admin-border);
  border-radius: 999px;
  background: var(--admin-surface);
  color: var(--admin-muted);
  font-size: 12px;
  line-height: 18px;
}
.hint-chip.is-next {
  border-color: var(--admin-accent);
  background: var(--admin-accent-soft);
  color: var(--admin-accent-text);
  font-weight: 600;
}

/* ------------------------------------------------------------- metric cards */
.metrics { display: grid; grid-template-columns: repeat(4, minmax(0, 1fr)); gap: 12px; }

.metric {
  position: relative;
  display: grid;
  gap: 8px;
  overflow: hidden;
  padding: 14px 16px 14px;
  border: 1px solid var(--admin-border);
  border-radius: var(--admin-radius);
  background: var(--admin-surface);
}
.metric::after {
  position: absolute;
  inset: 0;
  background: radial-gradient(120px 90px at 100% 0%, var(--admin-accent-soft), transparent 70%);
  content: '';
  pointer-events: none;
}

.metric-top { display: flex; align-items: flex-start; justify-content: space-between; gap: 10px; }
.metric-labels { display: grid; gap: 2px; min-width: 0; }
.metric-eyebrow { color: var(--admin-muted); font-size: 12px; line-height: 1.2; }
.metric-title { color: var(--admin-body); font-size: 12px; font-weight: 600; line-height: 1.3; }

.metric-icon {
  display: grid;
  width: 30px;
  height: 30px;
  flex: none;
  place-items: center;
  border: 1px solid var(--admin-accent-soft-hover);
  border-radius: 8px;
  background: var(--admin-accent-soft);
  color: var(--admin-accent-text);
}
.metric-icon :deep(svg) { width: 16px; height: 16px; }
.metric-icon--warn { border-color: color-mix(in oklab, var(--admin-warning) 22%, transparent); background: color-mix(in oklab, var(--admin-warning) 10%, transparent); color: var(--admin-warning); }

.metric-value { color: var(--admin-text); font-size: 30px; font-weight: 680; letter-spacing: -.03em; line-height: 1.05; font-variant-numeric: tabular-nums; }
.metric-meta { margin: 0; display: flex; align-items: center; gap: 6px; color: var(--admin-muted); font-size: 12px; }
.trend { font-weight: 640; font-variant-numeric: tabular-nums; }
.trend--up { color: var(--admin-success); }

/* ------------------------------------------------------------------- panels */
.lower { display: grid; grid-template-columns: minmax(0, 1.62fr) minmax(300px, 1fr); gap: 12px; }

.panel {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border: 1px solid var(--admin-border);
  border-radius: var(--admin-radius);
  background: var(--admin-surface);
}

.panel-head { display: flex; align-items: center; gap: 10px; padding: 14px 16px; border-bottom: 1px solid var(--admin-border); }
.panel-icon {
  display: grid;
  width: 28px;
  height: 28px;
  flex: none;
  place-items: center;
  border: 1px solid var(--admin-accent-soft-hover);
  border-radius: 8px;
  background: var(--admin-accent-soft);
  color: var(--admin-accent-text);
}
.panel-icon :deep(svg) { width: 14px; height: 14px; }
.panel-titles { min-width: 0; }
.panel-titles h2 { margin: 0; color: var(--admin-text); font-size: 14px; font-weight: 640; line-height: 1.3; }
.panel-titles p { margin: 2px 0 0; color: var(--admin-muted); font-size: 12px; }
.panel-link { margin-left: auto; color: var(--admin-muted); font-size: 12px; text-decoration: none; white-space: nowrap; }
.panel-link:hover { color: var(--admin-accent-text); }

.chip { display: inline-flex; align-items: center; gap: 4px; margin-left: auto; padding: 4px 8px; border: 1px solid var(--admin-border); border-radius: 1000px; color: var(--admin-muted); font-size: 10px; white-space: nowrap; }
.chip :deep(svg) { width: 12px; height: 12px; }

.chart-body { flex: 1; padding: 10px 14px 6px; }
.chart { display: block; width: 100%; height: 196px; }
.chart-grid line { stroke: var(--admin-border); stroke-width: 1; stroke-dasharray: 3 5; }
.chart-axis text { fill: var(--admin-faint); font-size: 10px; }
.chart-line { fill: none; stroke: var(--admin-accent); stroke-width: 2; stroke-linecap: round; stroke-linejoin: round; }
.chart-dot { fill: var(--admin-surface); stroke: var(--admin-accent); stroke-width: 1.8; }

.feed { display: grid; margin: 0; padding: 4px 0; list-style: none; }
.feed-item { display: flex; align-items: center; gap: 10px; padding: 10px 16px; color: inherit; text-decoration: none; }
.feed-item:hover { background: var(--admin-hover); }
.feed-icon { display: grid; width: 24px; height: 24px; flex: none; place-items: center; border: 1px solid var(--admin-border); border-radius: 6px; color: var(--admin-muted); }
.feed-icon :deep(svg) { width: 12px; height: 12px; }
.feed-title { flex: 1; min-width: 0; overflow: hidden; color: var(--admin-body); font-size: 12px; text-overflow: ellipsis; white-space: nowrap; }
.feed-item:hover .feed-title { color: var(--admin-accent-text); }
.feed-item time { flex: none; color: var(--admin-faint); font-size: 12px; }

/* -------------------------------------------------------------------- table */
.table-wrap { overflow-x: auto; }
table { width: 100%; border-collapse: collapse; }
th { padding: 10px 16px; border-bottom: 1px solid var(--admin-border); color: var(--admin-muted); font-size: 12px; font-weight: 600; text-align: left; white-space: nowrap; }
td { padding: 12px 16px; border-bottom: 1px solid var(--admin-border); color: var(--admin-body); font-size: 12px; white-space: nowrap; }
tbody tr:last-child td { border-bottom: 0; }
tbody tr:hover { background: var(--admin-hover); }
th.num, td.num { text-align: right; font-variant-numeric: tabular-nums; }
.cell-title { width: 100%; white-space: normal; }
.cell-title a { color: var(--admin-text); text-decoration: none; }
.cell-title a:hover { color: var(--admin-accent-text); }
.cell-time { color: var(--admin-muted); }

.panel-empty { display: grid; gap: 8px; padding: 26px 16px; justify-items: center; color: var(--admin-muted); font-size: 12px; text-align: center; }
.btn-inline { padding: 6px 10px; border: 1px solid var(--admin-border); border-radius: 6px; color: var(--admin-body); font-size: 12px; text-decoration: none; }
.btn-inline:hover { border-color: var(--admin-border-strong); }

/* --------------------------------------------------------------------- bars */
.bars { display: grid; grid-template-columns: repeat(3, minmax(0, 1fr)); gap: 10px 24px; padding: 14px 16px 16px; }
.bar-row { display: grid; gap: 6px; }
.bar-head { display: flex; align-items: baseline; justify-content: space-between; gap: 8px; color: var(--admin-muted); font-size: 12px; }
.bar-head strong { color: var(--admin-text); font-size: 12px; font-weight: 640; font-variant-numeric: tabular-nums; }
.bar-track { height: 6px; overflow: hidden; border-radius: 1000px; background: var(--admin-border); }
.bar-fill { display: block; height: 100%; border-radius: inherit; background: var(--admin-accent); transition: width var(--admin-duration) var(--admin-ease); }
.bar-fill--warn { background: color-mix(in oklab, var(--admin-warning) 78%, transparent); }
.bar-note { margin: 0; color: var(--admin-faint); font-size: 10px; }
.panel-clock {
  margin-left: auto;
  color: var(--admin-text);
  font-size: 18px;
  font-weight: 660;
  font-variant-numeric: tabular-nums;
  letter-spacing: .02em;
}

@media (max-width: 1180px) {
  .metrics { grid-template-columns: repeat(2, minmax(0, 1fr)); }
  .lower { grid-template-columns: minmax(0, 1fr); }
  .bars { grid-template-columns: repeat(2, minmax(0, 1fr)); }
}

@media (max-width: 640px) {
  .metrics { grid-template-columns: minmax(0, 1fr); }
  .bars { grid-template-columns: minmax(0, 1fr); }
  .metric-value { font-size: 26px; }
  .chart { height: 168px; }
}
</style>
