<script setup lang="ts">
import { ADMIN_MEDIA_ACCEPT, isSupportedMediaFile } from '~/composables/useAdminMedia'

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
const { notifySuccess, notifyError } = useAdminFeedback()
const { addFiles } = useAdminMedia()
const session = useState<{ csrfToken: string } | null>('admin-session')
const imageInput = useTemplateRef<HTMLInputElement>('imageInput')
const coverInput = useTemplateRef<HTMLInputElement>('coverInput')
const uploadingImages = ref(false)
const uploadingCover = ref(false)
const editor = useTemplateRef<{
  insertImage: (url: string, description: string) => void
  toggleFullscreen: () => void
}>('editor')
const form = reactive({
  title: props.post?.title || '', summary: props.post?.summary || '',
  contentMarkdown: props.post?.contentMarkdown || '', coverImageUrl: props.post?.coverImageUrl || '',
  seoTitle: props.post?.seoTitle || '', seoDescription: props.post?.seoDescription || '',
  tagIds: props.post?.tags.map(tag => tag.id) || [] as number[],
  status: props.post?.status || 'PUBLISHED' as 'PUBLISHED' | 'ARCHIVED',
})
const pending = ref(false)
const isFullscreen = ref(false)
const { data: tagResponse } = await useFetch<{ data: Tag[] }>('/api/admin/tags')
const tags = computed(() => tagResponse.value?.data || [])
const wordCount = computed(() => form.contentMarkdown.trim() ? form.contentMarkdown.trim().split(/\s+/).length : 0)
const readingTime = computed(() => Math.max(1, Math.ceil(wordCount.value / 250)))

async function save(status = form.status) {
  if (pending.value || !session.value) return
  pending.value = true
  try {
    const successMessage = !props.post ? '文章已发布'
      : status !== form.status ? (status === 'ARCHIVED' ? '文章已下线' : '文章已重新发布') : '文章已保存'
    const { status: _currentStatus, ...content } = form
    const body = props.post ? { ...content, status } : content
    if (props.post) {
      await $fetch(`/api/admin/posts/${props.post.id}`, { method: 'PUT', body, headers: { 'X-CSRF-Token': session.value.csrfToken } })
    }
    else {
      await $fetch('/api/admin/posts', { method: 'POST', body, headers: { 'X-CSRF-Token': session.value.csrfToken } })
    }
    form.status = status
    await navigateTo('/admin/posts')
    notifySuccess(successMessage)
  } catch (error) {
    notifyError(error, '操作失败，文章内容已保留')
  } finally { pending.value = false }
}

function pickImages(): void {
  imageInput.value?.click()
}

function baseName(name: string): string {
  return name.replace(/\.[^.]+$/, '')
}

async function uploadAndInsert(files: File[]): Promise<void> {
  if (!files.length) return

  const supported = files.filter(isSupportedMediaFile)
  if (!supported.length) {
    notifyError(new Error('仅支持 PNG / JPG / WebP / GIF / AVIF，且单张不超过 10MB'), '没有可上传的图片')
    return
  }

  uploadingImages.value = true
  try {
    const { added, rejected } = await addFiles(supported)
    for (const item of added) editor.value?.insertImage(item.url, baseName(item.name))
    if (added.length) notifySuccess(`已插入 ${added.length} 张图片`)
    if (rejected.length) notifyError(new Error(`${rejected.length} 张图片未通过校验`), '部分图片未上传')
  }
  catch (error) {
    notifyError(error, '图片上传失败')
  }
  finally {
    uploadingImages.value = false
  }
}

function onImagesPicked(event: Event): void {
  const input = event.target as HTMLInputElement
  void uploadAndInsert(Array.from(input.files ?? []))
  input.value = ''
}

function pickCover(): void {
  coverInput.value?.click()
}

async function uploadCover(file: File): Promise<void> {
  if (!isSupportedMediaFile(file)) {
    notifyError(new Error('仅支持 PNG / JPG / WebP / GIF / AVIF，且单张不超过 10MB'), '封面格式不支持')
    return
  }

  uploadingCover.value = true
  try {
    const { added } = await addFiles([file])
    const cover = added[0]
    if (!cover) {
      notifyError(new Error('封面保存失败，请稍后重试'), '上传封面失败')
      return
    }
    form.coverImageUrl = cover.url
    notifySuccess('封面已更新')
  }
  catch (error) {
    notifyError(error, '上传封面失败')
  }
  finally {
    uploadingCover.value = false
  }
}

function onCoverPicked(event: Event): void {
  const input = event.target as HTMLInputElement
  const file = input.files?.[0]
  input.value = ''
  if (file) void uploadCover(file)
}

function toggleFullscreen() {
  if (!editor.value) {
    notifyError(new Error('请等待 Markdown 编辑器加载完成后重试。'), '全屏编辑失败')
    return
  }
  editor.value.toggleFullscreen()
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
    <input
      ref="imageInput"
      type="file"
      class="hidden-input"
      :accept="ADMIN_MEDIA_ACCEPT"
      multiple
      @change="onImagesPicked"
    >
    <input
      ref="coverInput"
      type="file"
      class="hidden-input"
      :accept="ADMIN_MEDIA_ACCEPT"
      @change="onCoverPicked"
    >
    <div class="post-bar">
      <div class="bar-state">
        <span class="status-dot" :class="{ 'status-dot--muted': form.status === 'ARCHIVED' }" />
        <strong>{{ form.status === 'PUBLISHED' ? '已发布' : '已下线' }}</strong>
        <span class="bar-meta">{{ wordCount }} 字 · 约 {{ readingTime }} 分钟</span>
      </div>
      <div class="bar-actions">
        <UButton type="button" to="/admin/posts" size="sm" color="neutral" variant="ghost" icon="i-lucide-arrow-left">返回列表</UButton>
        <UButton v-if="props.post && form.status === 'PUBLISHED'" type="button" size="sm" color="neutral" variant="outline" :loading="pending" @click="save('ARCHIVED')">下线</UButton>
        <UButton v-if="props.post && form.status === 'ARCHIVED'" type="button" size="sm" color="primary" variant="outline" :loading="pending" @click="save('PUBLISHED')">重新发布</UButton>
        <UButton type="submit" size="sm" icon="i-lucide-save" :loading="pending" title="Ctrl + S">{{ props.post ? '保存修改' : '保存并发布' }}</UButton>
      </div>
    </div>

    <div class="post-body">
      <main class="post-editor-column">
        <UCard class="content-card" :ui="{ body: 'py-4 sm:py-4' }">
          <div class="content-fields">
            <UFormField label="标题" required><UInput v-model="form.title" maxlength="200" size="lg" class="title-input w-full" placeholder="输入文章标题…" /></UFormField>
            <UFormField label="摘要" required><UTextarea v-model="form.summary" maxlength="500" :rows="2" class="w-full" placeholder="用一两句话概括文章内容…" /><template #hint>{{ form.summary.length }}/500</template></UFormField>
          </div>
        </UCard>

        <UCard class="editor-card" :ui="{ root: 'editor-card', body: 'p-0 sm:p-0 editor-card-body', header: 'editor-card-head' }">
          <template #header>
            <div class="editor-toolbar">
              <div><strong>Markdown 正文</strong><span>{{ wordCount }} 字 · 约 {{ readingTime }} 分钟阅读</span></div>
              <div class="editor-actions">
                <UButton type="button" size="sm" color="neutral" variant="soft" :icon="isFullscreen ? 'i-lucide-minimize-2' : 'i-lucide-maximize-2'" @click="toggleFullscreen">{{ isFullscreen ? '退出全屏' : '全屏编辑' }}</UButton>
                <UButton type="button" size="sm" color="neutral" variant="soft" icon="i-lucide-image-plus" :loading="uploadingImages" @click="pickImages">上传图片</UButton>
              </div>
            </div>
          </template>
          <ClientOnly>
            <MarkdownEditor ref="editor" v-model="form.contentMarkdown" @fullscreen-change="isFullscreen = $event" />
            <template #fallback><div class="editor-loading"><UIcon name="i-lucide-loader-circle" class="loading-icon" /><span>编辑器加载中…</span></div></template>
          </ClientOnly>
        </UCard>
      </main>

      <aside class="post-options">
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
            <UFormField label="封面 URL">
              <div class="cover-field">
                <UInput v-model="form.coverImageUrl" type="url" class="w-full" placeholder="https://..." />
                <UButton type="button" color="neutral" variant="soft" :loading="uploadingCover" icon="i-lucide-upload" @click="pickCover">上传</UButton>
              </div>
            </UFormField>
            <div v-if="form.coverImageUrl" class="cover-preview"><img :src="form.coverImageUrl" alt="文章封面预览"></div>
            <UFormField label="SEO 标题"><UInput v-model="form.seoTitle" maxlength="200" class="w-full" /><template #hint>{{ form.seoTitle.length }}/200</template></UFormField>
            <UFormField label="SEO 描述"><UTextarea v-model="form.seoDescription" maxlength="500" :rows="4" class="w-full" /><template #hint>{{ form.seoDescription.length }}/500</template></UFormField>
          </div>
        </UCard>
      </aside>
    </div>
  </form>
</template>

<style scoped>
.post-form {
  --post-bar-height: 48px;
  width: 100%;
}

.post-bar {
  position: sticky;
  top: var(--admin-header-height, 60px);
  z-index: 6;
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  padding: 10px 0;
  background: var(--admin-bg, var(--color-background));
  box-shadow: 0 1px 0 var(--color-border);
}

.bar-state {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 0;
}

.bar-state strong {
  font-size: 13px;
  font-weight: 680;
}

.bar-meta {
  color: var(--color-text-secondary);
  font-size: 12px;
}

.bar-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  margin-left: auto;
}

.post-body {
  display: grid;
  gap: 20px;
  margin-top: 16px;
}

.post-editor-column,.post-options,.content-fields,.option-stack {
  display: grid;
  gap: 20px;
}

.post-editor-column {
  min-width: 0;
}

.post-options {
  grid-template-columns: repeat(2,minmax(0,1fr));
  align-items: start;
}

.editor-card {
  overflow: visible;
}

.editor-card :deep(.editor-card-body) {
  overflow: hidden;
  border-bottom-left-radius: inherit;
  border-bottom-right-radius: inherit;
}

.editor-card :deep(.editor-card-head) {
  position: sticky;
  top: calc(var(--admin-header-height, 60px) + var(--post-bar-height));
  z-index: 5;
  background: var(--ui-bg, var(--admin-surface, #fff));
  border-top-left-radius: inherit;
  border-top-right-radius: inherit;
  box-shadow: 0 1px 0 var(--color-border), 0 10px 16px -16px rgb(0 0 0 / 55%);
}

.card-heading,.editor-toolbar,.side-heading {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
}

.card-heading h2 {
  margin: 0;
  font-size: 14px;
}

.card-heading p {
  margin: 4px 0 0;
  color: var(--color-text-secondary);
  font-size: 12px;
}

.title-input :deep(input) {
  font-weight: 650;
  letter-spacing: -.01em;
}

.editor-toolbar strong {
  display: block;
  font-size: 14px;
}

.editor-toolbar span {
  display: block;
  margin-top: 4px;
  color: var(--color-text-secondary);
  font-size: 12px;
}

.editor-actions {
  display: flex;
  align-items: center;
  gap: 8px;
}

.editor-loading {
  display: flex;
  min-height: 680px;
  align-items: center;
  justify-content: center;
  gap: 9px;
  color: var(--color-text-secondary);
  font-size: 14px;
}

.loading-icon {
  animation: spin 1s linear infinite;
}

.side-heading {
  font-size: 14px;
  font-weight: 700;
}

.side-heading svg {
  color: var(--color-text-secondary);
}

.status-dot {
  width: 8px;
  height: 8px;
  flex: 0 0 auto;
  border-radius: 50%;
  background: #20a77c;
  box-shadow: 0 0 0 3px rgba(32,167,124,.13);
}

.status-dot--muted {
  background: #8b95a5;
  box-shadow: 0 0 0 3px rgba(139,149,165,.13);
}

.tag-list {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.tag-option {
  display: flex;
  align-items: center;
  gap: 6px;
  padding: 7px 9px;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  color: var(--color-text-secondary);
  font-size: 12px;
  cursor: pointer;
  transition: .16s ease;
}

.tag-option:hover,.tag-option--active {
  border-color: rgba(68,147,248,.55);
  color: #2878d4;
  background: rgba(68,147,248,.08);
}

.tag-option input {
  position: absolute;
  opacity: 0;
  pointer-events: none;
}

.empty-tags {
  display: grid;
  min-height: 90px;
  place-items: center;
  color: var(--color-text-secondary);
  text-align: center;
}

.empty-tags svg {
  font-size: 20px;
}

.empty-tags p {
  margin: 0;
  font-size: 12px;
}

.cover-preview {
  overflow: hidden;
  aspect-ratio: 16/9;
  border: 1px solid var(--color-border);
  border-radius: 9px;
  background: var(--color-background-secondary);
}

.cover-preview img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.cover-field {
  display: flex;
  align-items: center;
  gap: 8px;
}

.cover-field :deep(input) {
  min-width: 0;
}

.cover-field :deep(button) {
  flex: 0 0 auto;
  white-space: nowrap;
}

.hidden-input {
  display: none;
}

@keyframes spin {
  to {
    transform: rotate(360deg);
  }
}

@media (max-width: 1100px) {
  .post-options {
    grid-template-columns: repeat(2,minmax(0,1fr));
  }
}

@media (max-width: 700px) {
  .post-form {
    --post-bar-height: 80px;
  }

  .post-options {
    grid-template-columns: 1fr;
  }

  .bar-actions {
    width: 100%;
    margin-left: 0;
  }

  .bar-actions > * {
    flex: 1 1 auto;
    justify-content: center;
  }

  .editor-toolbar {
    align-items: flex-start;
    flex-direction: column;
  }

  .editor-actions {
    width: 100%;
  }

  .editor-actions :deep(button) {
    flex: 1;
    width: auto;
    justify-content: center;
  }
}
</style>
