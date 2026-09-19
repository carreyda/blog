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
watch(() => route.query.q, value => { searchInput.value = String(value || '') })
function search() { const q = searchInput.value.trim(); searchInput.value = q; router.push({ query: { ...(q ? { q } : {}), ...(route.query.tag ? { tag: route.query.tag } : {}) } }) }
function clearSearch() { searchInput.value = ''; search() }
function changePage(value: number) { router.push({ query: { ...route.query, page: value > 1 ? value : undefined } }) }
</script>

<template>
  <section class="blog-page">
    <header class="hero"><p class="eyebrow">WRITING</p><h1>{{ route.query.tag ? `# ${route.query.tag}` : '文章' }}</h1><p class="lead">记录技术实践、工程思考与持续学习。</p></header>
    <div class="search-area">
      <form class="blog-search" role="search" @submit.prevent="search">
        <UIcon name="i-lucide-search" class="search-icon" aria-hidden="true" />
        <input v-model="searchInput" type="search" aria-label="搜索文章" placeholder="搜索标题、摘要或标签">
        <button v-if="searchInput" class="clear-search" type="button" aria-label="清除搜索" title="清除" @click="clearSearch"><UIcon name="i-lucide-x" /></button>
        <button class="search-submit" type="submit">搜索</button>
      </form>
      <p v-if="route.query.q && !pending" class="search-result">找到 <strong>{{ total }}</strong> 篇与“{{ route.query.q }}”相关的文章</p>
    </div>
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
.blog-page{display:grid;gap:28px}.search-area{display:grid;width:min(100%,720px);gap:9px}.blog-search{display:flex;min-height:48px;align-items:center;gap:4px;padding:5px 5px 5px 15px;border:1px solid var(--color-border);border-radius:12px;background:var(--color-background);box-shadow:0 8px 28px rgba(0,0,0,.04);transition:border-color .16s ease,box-shadow .16s ease}.blog-search:focus-within{border-color:color-mix(in srgb,var(--color-primary) 65%,var(--color-border));box-shadow:0 0 0 3px color-mix(in srgb,var(--color-primary) 13%,transparent),0 10px 30px rgba(0,0,0,.06)}.search-icon{width:17px;height:17px;flex:0 0 auto;color:var(--color-text-muted)}.blog-search input{min-width:0;flex:1;padding:9px 8px;border:0;outline:0;background:transparent;color:inherit;font:inherit;font-size:13px}.blog-search input::-webkit-search-cancel-button{display:none}.clear-search{display:grid;width:32px;height:32px;flex:0 0 auto;place-items:center;padding:0;border:0;border-radius:8px;background:transparent;color:var(--color-text-secondary);cursor:pointer}.clear-search:hover{background:var(--color-background-secondary);color:var(--color-text)}.clear-search svg{width:15px;height:15px}.search-submit{height:38px;flex:0 0 auto;padding:0 18px;border:0;border-radius:8px;background:var(--color-primary);color:#fff;font:inherit;font-size:12px;font-weight:700;cursor:pointer;transition:background .16s ease,transform .16s ease}.search-submit:hover{background:var(--color-primary-hover)}.search-submit:active{transform:translateY(1px)}.search-result{margin:0 2px;color:var(--color-text-secondary);font-size:11px}.search-result strong{color:var(--color-text)}.pagination button{padding:9px 15px;border:0;background:var(--color-background-secondary);color:inherit;cursor:pointer}.post-list{display:grid}.post-card{padding:25px 0;border-bottom:1px solid var(--color-border)}.post-link{display:grid;grid-template-columns:1fr;gap:18px}.post-link.has-cover{grid-template-columns:150px 1fr}.post-link img{width:150px;height:100px;border-radius:var(--radius-sm);object-fit:cover}.post-meta{display:flex;gap:8px;color:var(--color-text-secondary);font-size:11px}.post-card h2{margin:8px 0;font-size:19px;letter-spacing:-.02em}.post-card p{margin:0;color:var(--color-text-secondary);font-size:13px;line-height:1.7}.tags{display:flex;flex-wrap:wrap;gap:9px;margin-top:12px;color:var(--color-primary);font-size:11px}.pagination{display:flex;align-items:center;justify-content:center;gap:16px;font-size:12px}.pagination button{border-radius:var(--radius-sm)}.pagination button:disabled{cursor:not-allowed;opacity:.4}.empty{padding:50px 0;text-align:center;color:var(--color-text-secondary)}@media(max-width:560px){.blog-search{padding-left:12px}.search-submit{padding:0 14px}.post-link.has-cover{grid-template-columns:1fr}.post-link img{width:100%;height:160px}}
</style>
