<script setup lang="ts">
type Tag = { id: number; name: string; slug: string }
type Post = { id: number; title: string; summary: string; coverImageUrl: string | null; publishedAt: string; readingMinutes: number; tags: Tag[] }
const route = useRoute()
const router = useRouter()
const page = computed(() => Math.max(1, Number.parseInt(String(route.query.page || '1'), 10) || 1))
const searchInput = ref(String(route.query.q || ''))
const query = computed(() => ({ page: page.value, pageSize: 10, q: route.query.q || undefined, tag: route.query.tag || undefined }))
const { data: response, pending } = await useFetch<{ data: { items: Post[]; total: number; pageSize: number } }>('/api/posts', { query })
const posts = computed(() => response.value?.data.items || [])
const total = computed(() => response.value?.data.total || 0)
useSeoMeta({ title: '文章', description: '技术文章与学习记录' })
function search() { router.push({ query: { ...(searchInput.value ? { q: searchInput.value } : {}), ...(route.query.tag ? { tag: route.query.tag } : {}) } }) }
function changePage(value: number) { router.push({ query: { ...route.query, page: value > 1 ? value : undefined } }) }
</script>

<template>
  <section class="blog-page">
    <header class="hero"><p class="eyebrow">WRITING</p><h1>{{ route.query.tag ? `# ${route.query.tag}` : '文章' }}</h1><p class="lead">记录技术实践、工程思考与持续学习。</p></header>
    <form class="blog-search" role="search" @submit.prevent="search"><input v-model="searchInput" type="search" placeholder="搜索标题、摘要或标签"><button type="submit">搜索</button></form>
    <div v-if="pending" class="empty">正在加载文章…</div>
    <div v-else-if="!posts.length" class="empty">暂无匹配的文章</div>
    <div v-else class="post-list">
      <article v-for="post in posts" :key="post.id" class="post-card">
        <NuxtLink :to="`/blog/${post.id}`" :class="['post-link', { 'has-cover': post.coverImageUrl }]">
          <img v-if="post.coverImageUrl" :src="post.coverImageUrl" :alt="post.title" loading="lazy">
          <div><div class="post-meta"><time :datetime="post.publishedAt">{{ new Date(post.publishedAt).toLocaleDateString('zh-CN') }}</time><span>·</span><span>{{ post.readingMinutes }} 分钟阅读</span></div><h2>{{ post.title }}</h2><p>{{ post.summary }}</p></div>
        </NuxtLink>
        <div v-if="post.tags.length" class="tags"><NuxtLink v-for="tag in post.tags" :key="tag.id" :to="`/tags/${tag.slug}`">#{{ tag.name }}</NuxtLink></div>
      </article>
    </div>
    <nav v-if="total > 10" class="pagination" aria-label="文章分页"><button :disabled="page <= 1" @click="changePage(page - 1)">上一页</button><span>第 {{ page }} / {{ Math.ceil(total / 10) }} 页</span><button :disabled="page >= Math.ceil(total / 10)" @click="changePage(page + 1)">下一页</button></nav>
  </section>
</template>

<style scoped>
.blog-page{display:grid;gap:28px}.blog-search{display:flex;border:1px solid var(--color-border);border-radius:var(--radius-sm);overflow:hidden}.blog-search input{min-width:0;flex:1;padding:10px 12px;border:0;outline:0;background:transparent;color:inherit;font:inherit}.blog-search button,.pagination button{padding:9px 15px;border:0;background:var(--color-background-secondary);color:inherit;cursor:pointer}.post-list{display:grid}.post-card{padding:25px 0;border-bottom:1px solid var(--color-border)}.post-link{display:grid;grid-template-columns:1fr;gap:18px}.post-link.has-cover{grid-template-columns:150px 1fr}.post-link img{width:150px;height:100px;border-radius:var(--radius-sm);object-fit:cover}.post-meta{display:flex;gap:8px;color:var(--color-text-secondary);font-size:11px}.post-card h2{margin:8px 0;font-size:19px;letter-spacing:-.02em}.post-card p{margin:0;color:var(--color-text-secondary);font-size:13px;line-height:1.7}.tags{display:flex;flex-wrap:wrap;gap:9px;margin-top:12px;color:var(--color-primary);font-size:11px}.pagination{display:flex;align-items:center;justify-content:center;gap:16px;font-size:12px}.pagination button{border-radius:var(--radius-sm)}.pagination button:disabled{cursor:not-allowed;opacity:.4}.empty{padding:50px 0;text-align:center;color:var(--color-text-secondary)}@media(max-width:560px){.post-link.has-cover{grid-template-columns:1fr}.post-link img{width:100%;height:160px}}
</style>
