<script setup lang="ts">
type Tag = { id: number; name: string; slug: string }
type TocItem = { id: string; text: string; level: number }
type Post = { id: number; title: string; summary: string; coverImageUrl: string | null; publishedAt: string; updatedAt: string; readingMinutes: number; tags: Tag[]; seoTitle: string | null; seoDescription: string | null; contentHtml: string; toc: TocItem[] }
const route = useRoute()
const { data: response, error } = await useFetch<{ data: Post }>(`/api/posts/${route.params.id}`)
if (error.value || !response.value?.data) throw createError({ statusCode: error.value?.statusCode || 404, statusMessage: '文章不存在或已下线' })
const post = computed(() => response.value!.data)
useSeoMeta({
  title: () => post.value.seoTitle || post.value.title,
  description: () => post.value.seoDescription || post.value.summary,
  ogTitle: () => post.value.seoTitle || post.value.title,
  ogDescription: () => post.value.seoDescription || post.value.summary,
  ogImage: () => post.value.coverImageUrl || undefined,
  ogType: 'article',
})
</script>

<template>
  <article class="article-page">
    <header class="article-header">
      <NuxtLink to="/blog" class="back">← 返回文章</NuxtLink>
      <h1>{{ post.title }}</h1><p class="summary">{{ post.summary }}</p>
      <div class="meta"><time :datetime="post.publishedAt">发布于 {{ new Date(post.publishedAt).toLocaleDateString('zh-CN') }}</time><span>·</span><span>{{ post.readingMinutes }} 分钟阅读</span></div>
      <div v-if="post.tags.length" class="tags"><NuxtLink v-for="tag in post.tags" :key="tag.id" :to="`/tags/${tag.slug}`">#{{ tag.name }}</NuxtLink></div>
      <img v-if="post.coverImageUrl" class="cover" :src="post.coverImageUrl" :alt="post.title">
    </header>
    <nav v-if="post.toc.length" class="toc" aria-label="文章目录"><strong>目录</strong><a v-for="item in post.toc" :key="item.id" :href="`#${item.id}`" :style="{ paddingLeft: `${(item.level - 2) * 14}px` }">{{ item.text }}</a></nav>
    <div class="markdown-body" v-html="post.contentHtml" />
  </article>
</template>

<style>
.article-page{display:grid;gap:30px}.article-header{display:grid;gap:14px}.article-header h1{margin:8px 0 0;font-size:32px;line-height:1.25}.back{width:fit-content;color:var(--color-primary);font-size:12px}.summary{margin:0;color:var(--color-text-secondary);font-size:15px;line-height:1.7}.meta{display:flex;gap:8px;color:var(--color-text-secondary);font-size:11px}.tags{display:flex;flex-wrap:wrap;gap:10px;color:var(--color-primary);font-size:11px}.cover{width:100%;max-height:360px;margin-top:10px;border-radius:var(--radius-md);object-fit:cover}.toc{display:grid;gap:8px;padding:18px;border:1px solid var(--color-border);border-radius:var(--radius-md);background:var(--color-background-secondary);font-size:12px}.toc strong{margin-bottom:4px}.toc a{color:var(--color-text-secondary)}.toc a:hover{color:var(--color-primary)}.markdown-body{font-family:system-ui,"Microsoft YaHei UI","Microsoft YaHei",sans-serif;font-size:15px;line-height:1.85;overflow-wrap:anywhere}.markdown-body h1,.markdown-body h2,.markdown-body h3,.markdown-body h4{scroll-margin-top:24px;margin:1.8em 0 .7em;line-height:1.35;letter-spacing:-.02em}.markdown-body h2{padding-bottom:.35em;border-bottom:1px solid var(--color-border);font-size:23px}.markdown-body h3{font-size:19px}.markdown-body p{margin:1em 0}.markdown-body a{color:var(--color-primary);text-decoration:underline;text-underline-offset:3px}.markdown-body img{max-width:100%;height:auto;border-radius:var(--radius-sm);vertical-align:middle}.markdown-body p>img:only-child{display:block;margin:24px auto}.markdown-body picture{display:block;max-width:100%;margin:24px auto;text-align:center}.markdown-body picture img{display:inline-block}.markdown-body blockquote{margin:20px 0;padding:2px 18px;border-left:3px solid var(--color-primary);color:var(--color-text-secondary)}.markdown-body code{padding:.18em .38em;border-radius:4px;background:var(--color-background-secondary);font-family:ui-monospace,SFMono-Regular,Consolas,monospace;font-size:.88em}.markdown-body pre{margin:22px 0;padding:18px;border-radius:var(--radius-md);overflow:auto}.markdown-body pre code{padding:0;background:none}.markdown-body table{display:block;width:100%;border-collapse:collapse;overflow-x:auto}.markdown-body th,.markdown-body td{padding:9px 12px;border:1px solid var(--color-border);text-align:left}.markdown-body hr{margin:32px 0;border:0;border-top:1px solid var(--color-border)}.markdown-body li{margin:.35em 0}

.article-header,
.toc {
  width: min(100%, 720px);
  margin-inline: auto;
}

.markdown-body > * {
  max-width: 720px;
  margin-right: auto;
  margin-left: auto;
}

.markdown-body > pre,
.markdown-body > table,
.markdown-body > picture,
.markdown-body > p:has(> img:only-child) {
  max-width: none;
}
</style>
