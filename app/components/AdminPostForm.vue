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
const publishOpen = ref(false)
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

function openPublish(): void {
  publishOpen.value = true
}

function toggleTag(id: number): void {
  const index = form.tagIds.indexOf(id)
  if (index >= 0) form.tagIds.splice(index, 1)
  else form.tagIds.push(id)
}

function submitPublish(): void {
  if (!form.title.trim()) {
    publishOpen.value = true
    notifyError(new Error('请先填写文章标题'), '还不能发布')
    return
  }
  if (!form.summary.trim()) {
    publishOpen.value = true
    notifyError(new Error('请补一段摘要，它会出现在列表与分享卡片里'), '还不能发布')
    return
  }
  void save()
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
    submitPublish()
  }
}

onMounted(() => window.addEventListener('keydown', shortcut))
onBeforeUnmount(() => window.removeEventListener('keydown', shortcut))
</script>

<template>
  <form class="post-form" @submit.prevent="submitPublish">
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
        <UButton type="button" size="sm" icon="i-lucide-send" :disabled="pending" title="Ctrl + S" @click="openPublish">{{ props.post ? '更新文章' : '发布文章' }}</UButton>
      </div>
    </div>

    <div class="post-body" :class="{ 'has-panel': publishOpen }">
      <main class="post-main">
        <div class="title-card">
          <input v-model="form.title" class="title-input" maxlength="200" placeholder="输入文章标题…">
        </div>

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

      <div v-if="publishOpen" class="publish-backdrop" @click="publishOpen = false" />

      <aside v-if="publishOpen" class="publish-panel" aria-label="发布设置">
        <header class="publish-head">
          <div>
            <h2>{{ props.post ? '更新文章' : '发布文章' }}</h2>
            <p>确认标签、封面与摘要后即可发布。</p>
          </div>
          <UButton type="button" size="xs" color="neutral" variant="ghost" icon="i-lucide-x" aria-label="关闭发布面板" @click="publishOpen = false" />
        </header>

        <div class="publish-body">
          <section class="publish-field">
            <div class="field-head">
              <span class="required">*</span><span>标签</span>
              <span class="counter">{{ form.tagIds.length }} 个</span>
            </div>
            <div v-if="tags.length" class="tag-chips">
              <button
                v-for="tag in tags"
                :key="tag.id"
                type="button"
                class="tag-chip"
                :class="{ 'is-active': form.tagIds.includes(tag.id) }"
                :aria-pressed="form.tagIds.includes(tag.id)"
                @click="toggleTag(tag.id)"
              >
                {{ tag.name }}
              </button>
            </div>
            <p v-if="!tags.length" class="field-hint">还没有标签，去标签管理创建一个就能在这里选择。</p>
            <p v-else class="field-hint">没有合适的？<NuxtLink to="/admin/tags" class="field-link">去标签管理新建</NuxtLink></p>
          </section>

          <section class="publish-field">
            <div class="field-head"><span class="required">*</span><span>文章封面</span></div>
            <button type="button" class="cover-box" :disabled="uploadingCover" @click="pickCover">
              <img v-if="form.coverImageUrl" :src="form.coverImageUrl" alt="文章封面预览">
              <template v-else>
                <UIcon :name="uploadingCover ? 'i-lucide-loader-circle' : 'i-lucide-plus'" :class="{ 'loading-icon': uploadingCover }" />
                <span>{{ uploadingCover ? '上传中…' : '上传封面' }}</span>
              </template>
            </button>
            <div class="cover-link">
              <UInput v-model="form.coverImageUrl" type="url" size="sm" class="w-full" placeholder="或用图片链接 https://..." />
              <UButton v-if="form.coverImageUrl" type="button" size="sm" color="neutral" variant="ghost" @click="form.coverImageUrl = ''">移除</UButton>
            </div>
            <p class="field-hint">建议 16 : 9，宽度不小于 1200px；会用在首页列表与分享卡片上。</p>
          </section>

          <section class="publish-field">
            <div class="field-head">
              <span class="required">*</span><span>编辑摘要</span>
              <span class="counter">{{ form.summary.length }}/500</span>
            </div>
            <UTextarea v-model="form.summary" maxlength="500" :rows="5" class="w-full" placeholder="用一两句话概括文章内容…" />
          </section>

          <details class="publish-seo">
            <summary>SEO 设置（可选）</summary>
            <div class="seo-fields">
              <UFormField label="SEO 标题"><UInput v-model="form.seoTitle" maxlength="200" class="w-full" /><template #hint>{{ form.seoTitle.length }}/200</template></UFormField>
              <UFormField label="SEO 描述"><UTextarea v-model="form.seoDescription" maxlength="500" :rows="3" class="w-full" /><template #hint>{{ form.seoDescription.length }}/500</template></UFormField>
            </div>
          </details>
        </div>

        <footer class="publish-foot">
          <UButton type="button" color="neutral" variant="ghost" @click="publishOpen = false">取消</UButton>
          <UButton type="button" icon="i-lucide-check" :loading="pending" @click="submitPublish">{{ props.post ? '确定并更新' : '确定并发布' }}</UButton>
        </footer>
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
  align-items: start;
}

.post-body.has-panel {
  grid-template-columns: minmax(0, 1fr) 420px;
}

.post-main {
  display: grid;
  gap: 20px;
  min-width: 0;
}

.title-card {
  padding: 10px 16px;
  border: 1px solid var(--color-border);
  border-radius: 10px;
  background: var(--admin-surface, var(--color-background));
  transition: border-color .16s ease, box-shadow .16s ease;
}

.title-card:focus-within {
  border-color: var(--admin-accent, var(--color-primary));
  box-shadow: 0 0 0 3px var(--admin-accent-ring, rgb(68 147 248 / 18%));
}

.title-input {
  width: 100%;
  padding: 6px 0;
  border: 0;
  background: transparent;
  color: var(--admin-text, var(--color-text));
  font-family: inherit;
  font-size: 22px;
  font-weight: 680;
  letter-spacing: -.02em;
  outline: none;
}

.title-input::placeholder {
  color: var(--admin-faint, var(--color-text-muted));
  font-weight: 500;
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

.editor-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
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

.publish-backdrop {
  display: none;
}

.publish-panel {
  position: sticky;
  top: calc(var(--admin-header-height, 60px) + var(--post-bar-height));
  display: flex;
  max-height: calc(100vh - var(--admin-header-height, 60px) - var(--post-bar-height) - 40px);
  flex-direction: column;
  overflow: hidden;
  border: 1px solid var(--color-border);
  border-radius: 10px;
  background: var(--admin-surface, var(--color-background));
  box-shadow: 0 24px 48px -40px rgb(15 23 42 / 55%);
}

.publish-head {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 12px;
  padding: 14px 16px;
  border-bottom: 1px solid var(--color-border);
}

.publish-head h2 {
  margin: 0;
  font-size: 15px;
  font-weight: 680;
}

.publish-head p {
  margin: 4px 0 0;
  color: var(--color-text-secondary);
  font-size: 12px;
}

.publish-body {
  display: grid;
  flex: 1 1 auto;
  gap: 18px;
  min-height: 0;
  padding: 16px;
  overflow-y: auto;
}

.publish-field {
  display: grid;
  gap: 10px;
}

.field-head {
  display: flex;
  align-items: center;
  gap: 6px;
  color: var(--admin-text, var(--color-text));
  font-size: 12px;
  font-weight: 600;
}

.required {
  color: #e5484d;
}

.counter {
  margin-left: auto;
  color: var(--color-text-secondary);
  font-weight: 500;
  font-variant-numeric: tabular-nums;
}

.field-hint {
  margin: 0;
  color: var(--color-text-secondary);
  font-size: 12px;
  line-height: 1.5;
}

.field-link {
  color: var(--admin-accent-text, var(--color-primary));
}

.field-link:hover {
  text-decoration: underline;
}

.tag-chips {
  display: flex;
  flex-wrap: wrap;
  gap: 8px;
}

.tag-chip {
  padding: 6px 12px;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  background: transparent;
  color: var(--color-text-secondary);
  font-size: 12px;
  cursor: pointer;
  transition: .16s ease;
}

.tag-chip:hover {
  border-color: var(--admin-accent, var(--color-primary));
  color: var(--admin-text, var(--color-text));
}

.tag-chip.is-active {
  border-color: var(--admin-accent, var(--color-primary));
  background: var(--admin-accent-soft, rgb(68 147 248 / 12%));
  color: var(--admin-accent-text, var(--color-primary));
  font-weight: 600;
}

.cover-box {
  display: grid;
  width: 100%;
  aspect-ratio: 16 / 9;
  place-content: center;
  justify-items: center;
  gap: 6px;
  overflow: hidden;
  padding: 0;
  border: 1px dashed var(--color-border);
  border-radius: 10px;
  background: var(--admin-surface-2, var(--color-background-secondary));
  color: var(--color-text-secondary);
  font-family: inherit;
  font-size: 12px;
  cursor: pointer;
  transition: border-color .16s ease, color .16s ease;
}

.cover-box:hover {
  border-color: var(--admin-accent, var(--color-primary));
  color: var(--admin-accent-text, var(--color-primary));
}

.cover-box img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.cover-box :deep(svg) {
  font-size: 20px;
}

.cover-link {
  display: flex;
  align-items: center;
  gap: 8px;
}

.publish-seo {
  padding-top: 14px;
  border-top: 1px solid var(--color-border);
}

.publish-seo summary {
  font-size: 12px;
  font-weight: 600;
  cursor: pointer;
}

.seo-fields {
  display: grid;
  gap: 12px;
  margin-top: 12px;
}

.publish-foot {
  display: flex;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
  padding: 12px 16px;
  border-top: 1px solid var(--color-border);
  background: var(--admin-surface, var(--color-background));
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
  .post-body.has-panel {
    grid-template-columns: minmax(0, 1fr);
  }

  .publish-backdrop {
    display: block;
    position: fixed;
    inset: 0;
    z-index: 39;
    background: rgb(15 23 42 / 38%);
  }

  .publish-panel {
    position: fixed;
    top: var(--admin-header-height, 60px);
    right: 0;
    bottom: 0;
    z-index: 40;
    width: min(420px, 94vw);
    max-height: none;
    border-top: 0;
    border-right: 0;
    border-bottom: 0;
    border-radius: 0;
  }
}

@media (max-width: 700px) {
  .post-form {
    --post-bar-height: 80px;
  }

  .publish-panel {
    width: 100vw;
  }

  .bar-actions {
    width: 100%;
    margin-left: 0;
  }

  .bar-actions > * {
    flex: 1 1 auto;
    justify-content: center;
  }

  .title-input {
    font-size: 18px;
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
