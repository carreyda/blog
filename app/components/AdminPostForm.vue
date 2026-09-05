<script setup lang="ts">
type Tag = { id: number; name: string; slug: string; postCount: number }
type Post = {
  id: number
  title: string
  summary: string
  contentMarkdown: string
  coverImageUrl: string | null
  seoTitle: string | null
  seoDescription: string | null
  status: 'PUBLISHED' | 'ARCHIVED'
  tags: Tag[]
}

const props = defineProps<{ post?: Post }>()
const session = useState<{ csrfToken: string } | null>('admin-session')
const editor = useTemplateRef<{ insertImage: (url: string, description: string) => void }>('editor')
const form = reactive({
  title: props.post?.title || '', summary: props.post?.summary || '',
  contentMarkdown: props.post?.contentMarkdown || '', coverImageUrl: props.post?.coverImageUrl || '',
  seoTitle: props.post?.seoTitle || '', seoDescription: props.post?.seoDescription || '',
  tagIds: props.post?.tags.map(tag => tag.id) || [] as number[],
  status: props.post?.status || 'PUBLISHED' as 'PUBLISHED' | 'ARCHIVED',
})
const pending = ref(false)
const errorMessage = ref('')
const { data: tagResponse } = await useFetch<{ data: Tag[] }>('/api/admin/tags')
const tags = computed(() => tagResponse.value?.data || [])
const wordCount = computed(() => form.contentMarkdown.trim() ? form.contentMarkdown.trim().split(/\s+/).length : 0)
const readingTime = computed(() => Math.max(1, Math.ceil(wordCount.value / 250)))

async function save(status = form.status) {
  if (pending.value || !session.value) return
  pending.value = true
  errorMessage.value = ''
  try {
    const { status: _currentStatus, ...content } = form
    const body = props.post ? { ...content, status } : content
    const response: any = props.post
      ? await $fetch(`/api/admin/posts/${props.post.id}`, { method: 'PUT', body, headers: { 'X-CSRF-Token': session.value.csrfToken } })
      : await $fetch('/api/admin/posts', { method: 'POST', body, headers: { 'X-CSRF-Token': session.value.csrfToken } })
    form.status = status
    await navigateTo(`/admin/posts/${response.data.id}/edit`)
  } catch (error: any) {
    errorMessage.value = error?.data?.error?.message || '保存失败，页面内容已保留，请重试'
  } finally { pending.value = false }
}

function insertImage() {
  const url = window.prompt('图片地址（仅支持 http/https）')?.trim()
  if (!url || !/^https?:\/\//i.test(url)) return
  const description = window.prompt('图片描述')?.trim() || '图片'
  editor.value?.insertImage(url, description)
}

function shortcut(event: KeyboardEvent) {
  if ((event.ctrlKey || event.metaKey) && event.key.toLowerCase() === 's') {
    event.preventDefault()
    void save()
  }
}

onMounted(() => window.addEventListener('keydown', shortcut))
onBeforeUnmount(() => window.removeEventListener('keydown', shortcut))
</script>

<template>
  <form class="post-form" @submit.prevent="save()">
    <main class="post-editor-column">
      <UCard class="content-card">
        <template #header>
          <div class="card-heading"><div><h2>文章内容</h2><p>清晰的标题与摘要有助于读者快速了解主题。</p></div><UBadge :color="form.status === 'PUBLISHED' ? 'success' : 'neutral'" variant="soft">{{ form.status === 'PUBLISHED' ? '已发布' : '已下线' }}</UBadge></div>
        </template>
        <div class="content-fields">
          <UFormField label="标题" required><UInput v-model="form.title" maxlength="200" size="xl" class="title-input w-full" placeholder="输入文章标题…" /></UFormField>
          <UFormField label="摘要" required><UTextarea v-model="form.summary" maxlength="500" :rows="3" class="w-full" placeholder="用一两句话概括文章内容…" /><template #hint>{{ form.summary.length }}/500</template></UFormField>
        </div>
      </UCard>

      <UCard class="editor-card" :ui="{ body: 'p-0 sm:p-0' }">
        <template #header>
          <div class="editor-toolbar">
            <div><strong>Markdown 正文</strong><span>{{ wordCount }} 字 · 约 {{ readingTime }} 分钟阅读</span></div>
            <UButton type="button" size="sm" color="neutral" variant="soft" icon="i-lucide-image-plus" @click="insertImage">插入图片</UButton>
          </div>
        </template>
        <ClientOnly>
          <MarkdownEditor ref="editor" v-model="form.contentMarkdown" />
          <template #fallback><div class="editor-loading"><UIcon name="i-lucide-loader-circle" class="loading-icon" /><span>编辑器加载中…</span></div></template>
        </ClientOnly>
      </UCard>
    </main>

    <aside class="post-options">
      <UCard class="publish-card">
        <template #header><div class="side-heading"><span>发布设置</span><UIcon name="i-lucide-send" /></div></template>
        <div class="option-stack">
          <div class="publish-state"><span class="status-dot" :class="{ 'status-dot--muted': form.status === 'ARCHIVED' }" /><div><strong>{{ form.status === 'PUBLISHED' ? '公开发布' : '已下线' }}</strong><p>{{ form.status === 'PUBLISHED' ? '文章对所有访客可见' : '文章仅在后台保留' }}</p></div></div>
          <UAlert v-if="errorMessage" color="error" variant="soft" :description="errorMessage" />
          <UButton type="submit" block size="lg" icon="i-lucide-save" :loading="pending">{{ props.post ? '保存修改' : '保存并发布' }}</UButton>
          <UButton v-if="props.post && form.status === 'PUBLISHED'" type="button" block color="neutral" variant="outline" :loading="pending" @click="save('ARCHIVED')">下线文章</UButton>
          <UButton v-if="props.post && form.status === 'ARCHIVED'" type="button" block color="primary" variant="outline" :loading="pending" @click="save('PUBLISHED')">重新发布</UButton>
          <p class="shortcut-hint"><kbd>Ctrl</kbd><span>+</span><kbd>S</kbd><span>快速保存</span></p>
        </div>
      </UCard>

      <UCard>
        <template #header><div class="side-heading"><span>文章标签</span><UIcon name="i-lucide-tags" /></div></template>
        <div v-if="tags.length" class="tag-list">
          <label v-for="tag in tags" :key="tag.id" class="tag-option" :class="{ 'tag-option--active': form.tagIds.includes(tag.id) }"><input v-model="form.tagIds" type="checkbox" :value="tag.id"><span>{{ tag.name }}</span><UIcon v-if="form.tagIds.includes(tag.id)" name="i-lucide-check" /></label>
        </div>
        <div v-else class="empty-tags"><UIcon name="i-lucide-tag" /><p>暂无标签，可在标签管理中创建。</p></div>
      </UCard>

      <UCard>
        <template #header><div class="side-heading"><span>封面与 SEO</span><UIcon name="i-lucide-sparkles" /></div></template>
        <div class="option-stack">
          <UFormField label="封面 URL"><UInput v-model="form.coverImageUrl" type="url" class="w-full" placeholder="https://..." /></UFormField>
          <div v-if="form.coverImageUrl" class="cover-preview"><img :src="form.coverImageUrl" alt="文章封面预览"></div>
          <UFormField label="SEO 标题"><UInput v-model="form.seoTitle" maxlength="200" class="w-full" /><template #hint>{{ form.seoTitle.length }}/200</template></UFormField>
          <UFormField label="SEO 描述"><UTextarea v-model="form.seoDescription" maxlength="500" :rows="4" class="w-full" /><template #hint>{{ form.seoDescription.length }}/500</template></UFormField>
        </div>
      </UCard>
    </aside>
  </form>
</template>

<style scoped>
.post-form{display:grid;width:100%;grid-template-columns:minmax(0,1fr) 316px;gap:24px;align-items:start}.post-editor-column,.post-options,.content-fields,.option-stack{display:grid;gap:20px}.post-options{position:sticky;top:92px}.card-heading,.editor-toolbar,.side-heading{display:flex;align-items:center;justify-content:space-between;gap:16px}.card-heading h2{margin:0;font-size:15px}.card-heading p{margin:4px 0 0;color:var(--color-text-secondary);font-size:12px}.title-input :deep(input){font-weight:650;letter-spacing:-.01em}.editor-toolbar strong{display:block;font-size:14px}.editor-toolbar span{display:block;margin-top:4px;color:var(--color-text-secondary);font-size:11px}.editor-loading{display:flex;min-height:680px;align-items:center;justify-content:center;gap:9px;color:var(--color-text-secondary);font-size:13px}.loading-icon{animation:spin 1s linear infinite}.side-heading{font-size:13px;font-weight:700}.side-heading svg{color:var(--color-text-secondary)}.publish-state{display:flex;gap:10px;padding:12px;border:1px solid var(--color-border);border-radius:10px;background:var(--color-background-secondary)}.publish-state strong{display:block;font-size:12px}.publish-state p{margin:3px 0 0;color:var(--color-text-secondary);font-size:11px}.status-dot{width:8px;height:8px;flex:0 0 auto;margin-top:4px;border-radius:50%;background:#20a77c;box-shadow:0 0 0 3px rgba(32,167,124,.13)}.status-dot--muted{background:#8b95a5;box-shadow:0 0 0 3px rgba(139,149,165,.13)}.shortcut-hint{display:flex;align-items:center;justify-content:center;gap:5px;margin:0;color:var(--color-text-secondary);font-size:10px}.shortcut-hint kbd{padding:2px 5px;border:1px solid var(--color-border);border-bottom-width:2px;border-radius:4px;background:var(--color-background-secondary);font-family:inherit}.tag-list{display:flex;flex-wrap:wrap;gap:8px}.tag-option{display:flex;align-items:center;gap:6px;padding:7px 9px;border:1px solid var(--color-border);border-radius:8px;color:var(--color-text-secondary);font-size:12px;cursor:pointer;transition:.16s ease}.tag-option:hover,.tag-option--active{border-color:rgba(68,147,248,.55);color:#2878d4;background:rgba(68,147,248,.08)}.tag-option input{position:absolute;opacity:0;pointer-events:none}.empty-tags{display:grid;min-height:90px;place-items:center;color:var(--color-text-secondary);text-align:center}.empty-tags svg{font-size:20px}.empty-tags p{margin:0;font-size:11px}.cover-preview{overflow:hidden;aspect-ratio:16/9;border:1px solid var(--color-border);border-radius:9px;background:var(--color-background-secondary)}.cover-preview img{width:100%;height:100%;object-fit:cover}@keyframes spin{to{transform:rotate(360deg)}}@media(max-width:1100px){.post-form{grid-template-columns:1fr}.post-options{position:static;grid-template-columns:repeat(2,minmax(0,1fr))}.publish-card{grid-column:1/-1}}@media(max-width:700px){.post-options{grid-template-columns:1fr}.publish-card{grid-column:auto}.editor-toolbar{align-items:flex-start;flex-direction:column}.editor-toolbar :deep(button){width:100%;justify-content:center}}
</style>
