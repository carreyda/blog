<script setup lang="ts">
type Bookmark = { id: number; name: string; description: string; iconUrl: string | null; url: string }
type ChildCategory = { id: number; name: string; bookmarks: Bookmark[] }
type RootCategory = { id: number; name: string; children: ChildCategory[] }

const { data: response, pending } = await useFetch<{ data: RootCategory[] }>('/api/bookmarks')
const categories = computed(() => response.value?.data || [])
const search = ref('')
const brokenIcons = ref(new Set<number>())
const total = computed(() => categories.value.reduce((sum, parent) => sum + parent.children.reduce((childSum, child) => childSum + child.bookmarks.length, 0), 0))
const filteredCategories = computed(() => {
  const keyword = search.value.trim().toLocaleLowerCase()
  if (!keyword) return categories.value
  return categories.value.map(parent => ({
    ...parent,
    children: parent.children.map(child => ({
      ...child,
      bookmarks: child.bookmarks.filter(bookmark => [bookmark.name, bookmark.description, bookmark.url]
        .some(value => value.toLocaleLowerCase().includes(keyword))),
    })).filter(child => child.bookmarks.length),
  })).filter(parent => parent.children.length)
})

function markIconBroken(id: number) {
  brokenIcons.value = new Set([...brokenIcons.value, id])
}

function hostname(url: string) {
  try { return new URL(url).hostname.replace(/^www\./, '') } catch { return url }
}

useSeoMeta({ title: '收藏', description: '按分类整理的实用网站、开发工具与学习资源。' })
</script>

<template>
  <section class="bookmarks-page">
    <header class="hero bookmarks-hero">
      <div><p class="eyebrow">BOOKMARKS</p><h1>收藏</h1><p class="lead">整理值得反复访问的工具、资源与灵感来源。</p></div>
      <span v-if="total" class="total-badge"><strong>{{ total }}</strong> 个站点</span>
    </header>

    <div v-if="categories.length" class="bookmark-toolbar">
      <label class="bookmark-search"><UIcon name="i-lucide-search" /><input v-model="search" type="search" placeholder="搜索收藏名称、描述或网址" aria-label="搜索收藏"><button v-if="search" type="button" aria-label="清除搜索" @click="search = ''"><UIcon name="i-lucide-x" /></button></label>
      <nav class="category-nav" aria-label="收藏分类"><a v-for="category in categories" :key="category.id" :href="`#bookmark-category-${category.id}`">{{ category.name }}</a></nav>
    </div>

    <div v-if="pending" class="empty-state">正在加载收藏…</div>
    <div v-else-if="!categories.length" class="empty-state"><UIcon name="i-lucide-bookmark" /><strong>暂时还没有公开收藏</strong><p>以后会把常用的网站整理在这里。</p></div>
    <div v-else-if="!filteredCategories.length" class="empty-state"><UIcon name="i-lucide-search-x" /><strong>没有找到匹配的网站</strong><p>换一个关键词试试看。</p></div>
    <div v-else class="category-sections">
      <section v-for="parent in filteredCategories" :id="`bookmark-category-${parent.id}`" :key="parent.id" class="category-section">
        <header class="category-heading"><span><UIcon name="i-lucide-folder-open" /></span><div><h2>{{ parent.name }}</h2><p>{{ parent.children.reduce((sum, child) => sum + child.bookmarks.length, 0) }} 个站点</p></div></header>
        <section v-for="child in parent.children" :key="child.id" class="child-section">
          <h3>{{ child.name }}</h3>
          <div class="bookmark-grid">
            <a v-for="bookmark in child.bookmarks" :key="bookmark.id" class="bookmark-card" :href="bookmark.url" target="_blank" rel="noopener noreferrer">
              <span class="site-icon">
                <img v-if="bookmark.iconUrl && !brokenIcons.has(bookmark.id)" :src="bookmark.iconUrl" alt="" loading="lazy" @error="markIconBroken(bookmark.id)">
                <UIcon v-else name="i-lucide-globe-2" />
              </span>
              <span class="site-content"><strong>{{ bookmark.name }}</strong><p>{{ bookmark.description }}</p><small>{{ hostname(bookmark.url) }}</small></span>
              <UIcon class="external-icon" name="i-lucide-arrow-up-right" />
            </a>
          </div>
        </section>
      </section>
    </div>
  </section>
</template>

<style scoped>
.bookmarks-page{display:grid;gap:30px}.bookmarks-hero{display:flex;align-items:flex-end;justify-content:space-between;gap:24px}.total-badge{display:flex;align-items:baseline;gap:5px;padding:8px 12px;border:1px solid var(--color-border);border-radius:999px;color:var(--color-text-secondary);font-size:10px}.total-badge strong{color:var(--color-primary);font-size:15px}.bookmark-toolbar{position:sticky;z-index:5;top:12px;display:grid;grid-template-columns:minmax(260px,430px) minmax(0,1fr);align-items:center;gap:18px;padding:10px;border:1px solid var(--color-border);border-radius:14px;background:color-mix(in srgb,var(--color-background) 92%,transparent);box-shadow:0 10px 32px rgba(0,0,0,.05);backdrop-filter:blur(16px)}.bookmark-search{display:flex;min-height:40px;align-items:center;gap:8px;padding:0 11px;border-radius:9px;background:var(--color-background-secondary);color:var(--color-text-muted)}.bookmark-search>svg{width:16px;flex:0 0 auto}.bookmark-search input{min-width:0;flex:1;border:0;outline:0;color:var(--color-text);background:transparent;font:inherit;font-size:11.5px}.bookmark-search input::-webkit-search-cancel-button{display:none}.bookmark-search button{display:grid;width:25px;height:25px;padding:0;place-items:center;border:0;border-radius:6px;color:var(--color-text-secondary);background:transparent;cursor:pointer}.bookmark-search button:hover{background:var(--color-border)}.category-nav{display:flex;align-items:center;justify-content:flex-end;gap:7px;overflow-x:auto}.category-nav a{flex:0 0 auto;padding:7px 10px;border-radius:8px;color:var(--color-text-secondary);font-size:10.5px}.category-nav a:hover{color:var(--color-primary);background:color-mix(in srgb,var(--color-primary) 9%,transparent)}.category-sections{display:grid;gap:54px}.category-section{scroll-margin-top:95px}.category-heading{display:flex;align-items:center;gap:12px;margin-bottom:24px;padding-bottom:14px;border-bottom:1px solid var(--color-border)}.category-heading>span{display:grid;width:38px;height:38px;place-items:center;border-radius:11px;color:var(--color-primary);background:color-mix(in srgb,var(--color-primary) 11%,transparent)}.category-heading svg{width:18px}.category-heading h2{margin:0;font-family:system-ui,"Microsoft YaHei UI",sans-serif;font-size:18px;letter-spacing:-.02em}.category-heading p{margin:4px 0 0;color:var(--color-text-muted);font-size:10px}.child-section+.child-section{margin-top:31px}.child-section h3{margin:0 0 13px;color:var(--color-text-secondary);font-size:11px;font-weight:650;letter-spacing:.03em}.bookmark-grid{display:grid;grid-template-columns:repeat(3,minmax(0,1fr));gap:12px}.bookmark-card{position:relative;display:grid;min-height:132px;grid-template-columns:44px minmax(0,1fr);align-items:start;gap:13px;padding:17px;border:1px solid var(--color-border);border-radius:13px;background:var(--color-background);transition:border-color .18s ease,transform .18s ease,box-shadow .18s ease}.bookmark-card:hover{border-color:color-mix(in srgb,var(--color-primary) 55%,var(--color-border));transform:translateY(-2px);box-shadow:0 12px 30px rgba(0,0,0,.07)}.site-icon{display:grid;width:44px;height:44px;overflow:hidden;place-items:center;border:1px solid var(--color-border);border-radius:12px;color:var(--color-primary);background:var(--color-background-secondary)}.site-icon img{width:100%;height:100%;object-fit:cover}.site-icon svg{width:19px;height:19px}.site-content{display:block;min-width:0}.site-content strong{display:block;padding-right:20px;overflow:hidden;font-family:system-ui,"Microsoft YaHei UI",sans-serif;font-size:13.5px;text-overflow:ellipsis;white-space:nowrap}.site-content p{display:-webkit-box;margin:7px 0;color:var(--color-text-secondary);overflow:hidden;font-size:10.5px;line-height:1.55;-webkit-box-orient:vertical;-webkit-line-clamp:2}.site-content small{display:block;overflow:hidden;color:var(--color-text-muted);font-size:9.5px;text-overflow:ellipsis;white-space:nowrap}.external-icon{position:absolute;top:17px;right:16px;width:15px;height:15px;color:var(--color-text-muted);transition:color .18s ease,transform .18s ease}.bookmark-card:hover .external-icon{color:var(--color-primary);transform:translate(2px,-2px)}.empty-state{display:grid;min-height:300px;place-items:center;align-content:center;gap:9px;color:var(--color-text-secondary);text-align:center}.empty-state>svg{width:28px;height:28px;margin-bottom:4px;color:var(--color-text-muted)}.empty-state strong{color:var(--color-text);font-size:13px}.empty-state p{margin:0;font-size:11px}
@media(max-width:980px){.bookmark-grid{grid-template-columns:repeat(2,minmax(0,1fr))}.bookmark-toolbar{grid-template-columns:1fr}.category-nav{justify-content:flex-start}}@media(max-width:620px){.bookmarks-hero{align-items:flex-start;flex-direction:column}.bookmark-grid{grid-template-columns:1fr}.bookmark-toolbar{position:static}.bookmark-card{min-height:118px}.category-sections{gap:42px}}
</style>
