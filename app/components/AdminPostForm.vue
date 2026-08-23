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
  title: props.post?.title || '',
  summary: props.post?.summary || '',
  contentMarkdown: props.post?.contentMarkdown || '',
  coverImageUrl: props.post?.coverImageUrl || '',
  seoTitle: props.post?.seoTitle || '',
  seoDescription: props.post?.seoDescription || '',
  tagIds: props.post?.tags.map(tag => tag.id) || [] as number[],
  status: props.post?.status || 'PUBLISHED' as 'PUBLISHED' | 'ARCHIVED',
})
const pending = ref(false)
const errorMessage = ref('')
const { data: tagResponse } = await useFetch<{ data: Tag[] }>('/api/admin/tags')
const tags = computed(() => tagResponse.value?.data || [])

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
  } finally {
    pending.value = false
  }
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
    <div class="form-grid">
      <UFormField label="标题" required><UInput v-model="form.title" maxlength="200" class="w-full" /></UFormField>
      <UFormField label="摘要" required><UTextarea v-model="form.summary" maxlength="500" :rows="3" class="w-full" /></UFormField>
      <div class="editor-heading"><span>Markdown 正文 *</span><UButton type="button" size="sm" color="neutral" variant="soft" @click="insertImage">插入图片 URL</UButton></div>
      <ClientOnly>
        <MarkdownEditor ref="editor" v-model="form.contentMarkdown" />
        <template #fallback><div class="editor-loading">编辑器加载中…</div></template>
      </ClientOnly>
    </div>

    <aside class="post-options">
      <UCard>
        <template #header><strong>发布设置</strong></template>
        <div class="option-stack">
          <p class="hint">系统不自动保存。按 Ctrl+S 可手动保存。</p>
          <UAlert v-if="errorMessage" color="error" variant="soft" :description="errorMessage" />
          <UButton type="submit" block :loading="pending">{{ props.post ? '保存修改' : '保存并发布' }}</UButton>
          <UButton v-if="props.post && form.status === 'PUBLISHED'" type="button" block color="neutral" variant="outline" :loading="pending" @click="save('ARCHIVED')">下线文章</UButton>
          <UButton v-if="props.post && form.status === 'ARCHIVED'" type="button" block color="primary" variant="outline" :loading="pending" @click="save('PUBLISHED')">重新发布</UButton>
        </div>
      </UCard>
      <UCard>
        <template #header><strong>标签</strong></template>
        <div v-if="tags.length" class="tag-list">
          <label v-for="tag in tags" :key="tag.id"><input v-model="form.tagIds" type="checkbox" :value="tag.id"> {{ tag.name }}</label>
        </div>
        <p v-else class="hint">暂无标签，可稍后在标签管理中创建。</p>
      </UCard>
      <UCard>
        <template #header><strong>封面与 SEO</strong></template>
        <div class="option-stack">
          <UFormField label="封面 URL"><UInput v-model="form.coverImageUrl" type="url" class="w-full" /></UFormField>
          <UFormField label="SEO 标题"><UInput v-model="form.seoTitle" maxlength="200" class="w-full" /></UFormField>
          <UFormField label="SEO 描述"><UTextarea v-model="form.seoDescription" maxlength="500" :rows="3" class="w-full" /></UFormField>
        </div>
      </UCard>
    </aside>
  </form>
</template>

<style scoped>
.post-form { display: grid; width: 100%; grid-template-columns: minmax(600px, 1fr) 300px; gap: 28px; align-items: start; }
.form-grid, .post-options, .option-stack { display: grid; gap: 18px; }
.editor-heading { display: flex; align-items: center; justify-content: space-between; font-size: 14px; font-weight: 600; }
.editor-loading { min-height: 720px; padding: 24px; border: 1px solid var(--color-border); border-radius: var(--radius-sm); }
.hint { margin: 0; color: var(--color-text-secondary); font-size: 12px; line-height: 1.6; }
.tag-list { display: grid; gap: 10px; font-size: 13px; }
.tag-list label { cursor: pointer; }
@media (max-width: 1000px) { .post-form { grid-template-columns: 1fr; } }
</style>
