<script setup lang="ts">
import {
  ADMIN_MEDIA_ACCEPT,
  ADMIN_MEDIA_MAX_BYTES,
  formatMediaBytes,
  isSupportedMediaFile,
} from '~/composables/useAdminMedia'

const props = defineProps<{
  open: boolean
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  confirm: [files: File[]]
}>()

interface SelectedFile {
  file: File
  url: string
  name: string
}

const inputRef = useTemplateRef<HTMLInputElement>('fileInput')
const selected = ref<SelectedFile[]>([])
const isDragging = ref(false)
const errorMessage = ref('')
let dragDepth = 0

const openModel = computed({
  get: () => props.open,
  set: (value: boolean) => emit('update:open', value),
})

const acceptHint = `PNG / JPG / WebP / GIF / AVIF，单张不超过 ${formatMediaBytes(ADMIN_MEDIA_MAX_BYTES)}`
const totalBytes = computed(() => selected.value.reduce((sum, entry) => sum + entry.file.size, 0))

watch(() => props.open, (open) => {
  if (!open) reset()
})

onBeforeUnmount(reset)

function reset(): void {
  selected.value.forEach(entry => URL.revokeObjectURL(entry.url))
  selected.value = []
  errorMessage.value = ''
  isDragging.value = false
  dragDepth = 0
}

function chooseFiles(): void {
  inputRef.value?.click()
}

function onChange(event: Event): void {
  const input = event.target as HTMLInputElement
  addFiles(Array.from(input.files ?? []))
  input.value = ''
}

function addFiles(files: File[]): void {
  if (!files.length) return
  const rejected: string[] = []

  for (const file of files) {
    if (!isSupportedMediaFile(file)) {
      rejected.push(file.name)
      continue
    }
    selected.value.push({ file, url: URL.createObjectURL(file), name: file.name })
  }

  errorMessage.value = rejected.length
    ? `${rejected.length} 个文件已跳过：仅支持 ${acceptHint}`
    : ''
}

function onDragEnter(event: DragEvent): void {
  event.preventDefault()
  dragDepth += 1
  isDragging.value = true
}

function onDragOver(event: DragEvent): void {
  event.preventDefault()
  if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy'
}

function onDragLeave(event: DragEvent): void {
  event.preventDefault()
  dragDepth = Math.max(0, dragDepth - 1)
  if (dragDepth === 0) isDragging.value = false
}

function onDrop(event: DragEvent): void {
  event.preventDefault()
  dragDepth = 0
  isDragging.value = false
  addFiles(Array.from(event.dataTransfer?.files ?? []))
}

function removeAt(index: number): void {
  const entry = selected.value[index]
  if (!entry) return
  URL.revokeObjectURL(entry.url)
  selected.value.splice(index, 1)
}

function resolveUploadFile(entry: SelectedFile): File {
  const name = entry.name.trim().slice(0, 255)
  if (!name || name === entry.file.name) return entry.file
  return new File([entry.file], name, { type: entry.file.type, lastModified: entry.file.lastModified })
}

function confirm(): void {
  if (!selected.value.length) return
  const files = selected.value.map(resolveUploadFile)
  reset()
  emit('confirm', files)
}
</script>

<template>
  <UModal
    v-model:open="openModel"
    title="上传图片"
    description="选择本地图片加入图片库，支持在加入后继续裁剪与预览。"
    :ui="{ content: 'max-w-2xl' }"
  >
    <template #body>
      <div class="uploader">
        <div
          class="dropzone"
          :class="{ 'is-dragging': isDragging }"
          role="button"
          tabindex="0"
          @click="chooseFiles"
          @keydown.enter.prevent="chooseFiles"
          @keydown.space.prevent="chooseFiles"
          @dragenter.prevent="onDragEnter"
          @dragover.prevent="onDragOver"
          @dragleave.prevent="onDragLeave"
          @drop.prevent="onDrop"
        >
          <span class="dropzone-icon"><UIcon name="i-lucide-image-plus" /></span>
          <strong>拖拽图片到这里，或点击选择文件</strong>
          <span class="dropzone-hint">{{ acceptHint }}</span>
          <input
            ref="fileInput"
            type="file"
            class="file-input"
            :accept="ADMIN_MEDIA_ACCEPT"
            multiple
            @change="onChange"
          >
        </div>

        <p v-if="errorMessage" class="uploader-error">
          <UIcon name="i-lucide-circle-alert" />
          <span>{{ errorMessage }}</span>
        </p>

        <ul v-if="selected.length" class="selected-list">
          <li v-for="(entry, index) in selected" :key="entry.url" class="selected-item">
            <img :src="entry.url" :alt="entry.name" class="selected-thumb">
            <div class="selected-text">
              <UInput
                v-model="entry.name"
                size="sm"
                class="selected-name"
                placeholder="图片名称"
                aria-label="图片名称"
                maxlength="255"
              />
              <span class="selected-meta">
                {{ formatMediaBytes(entry.file.size) }}
                <template v-if="entry.name.trim() !== entry.file.name">· 原名 {{ entry.file.name }}</template>
              </span>
            </div>
            <button
              type="button"
              class="remove-button"
              aria-label="移除这张图片"
              @click="removeAt(index)"
            >
              <UIcon name="i-lucide-x" />
            </button>
          </li>
        </ul>

        <p class="uploader-note">
          <UIcon name="i-lucide-info" />
          <span>可修改每张图片的名称；名称只影响图片库展示与下载，不改变图片链接。图片会直接上传到腾讯云 COS。</span>
        </p>
      </div>
    </template>

    <template #footer>
      <div class="uploader-footer">
        <span class="uploader-summary">
          {{ selected.length ? `已选择 ${selected.length} 张 · 合计 ${formatMediaBytes(totalBytes)}` : '尚未选择图片' }}
        </span>
        <div class="uploader-actions">
          <UButton color="neutral" variant="ghost" @click="openModel = false">取消</UButton>
          <UButton icon="i-lucide-upload" :disabled="!selected.length" @click="confirm">加入图片库</UButton>
        </div>
      </div>
    </template>
  </UModal>
</template>

<style scoped>
.uploader {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.dropzone {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 7px;
  width: 100%;
  min-height: 172px;
  padding: 24px 16px;
  border: 1.5px dashed var(--admin-border-strong);
  border-radius: var(--admin-radius-lg);
  background: var(--admin-surface-2);
  color: var(--admin-muted);
  text-align: center;
  cursor: pointer;
  transition:
    border-color var(--admin-duration) var(--admin-ease),
    background-color var(--admin-duration) var(--admin-ease);
}

.dropzone:hover,
.dropzone:focus-visible,
.dropzone.is-dragging {
  border-color: var(--admin-accent);
  background: var(--admin-accent-soft);
  outline: none;
}

.dropzone-icon {
  display: grid;
  place-items: center;
  width: 38px;
  height: 38px;
  border-radius: var(--admin-radius);
  background: var(--admin-accent-soft);
  color: var(--admin-accent-text);
}

.dropzone-icon :deep(svg) {
  width: 20px;
  height: 20px;
}

.dropzone strong {
  color: var(--admin-text);
  font-size: 12.5px;
  font-weight: 620;
}

.dropzone-hint {
  color: var(--admin-faint);
  font-size: 11px;
}

.file-input {
  display: none;
}

.uploader-error {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  margin: 0;
  color: var(--admin-danger);
  font-size: 11.5px;
  line-height: 1.55;
}

.uploader-error :deep(svg) {
  flex: none;
  width: 14px;
  height: 14px;
  margin-top: 1px;
}

.selected-list {
  display: flex;
  flex-direction: column;
  gap: 8px;
  max-height: 220px;
  margin: 0;
  padding: 0;
  overflow: auto;
  list-style: none;
}

.selected-item {
  display: flex;
  align-items: center;
  gap: 8px;
  min-width: 0;
  padding: 6px;
  border: 1px solid var(--admin-border);
  border-radius: var(--admin-radius);
  background: var(--admin-surface);
}

.selected-thumb {
  flex: none;
  width: 40px;
  height: 40px;
  border-radius: 6px;
  background: var(--admin-surface-2);
  object-fit: cover;
}

.selected-text {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.selected-name {
  width: 100%;
  min-width: 0;
}

.selected-name :deep(input) {
  font-size: 12px;
}

.selected-meta {
  color: var(--admin-faint);
  font-size: 10.5px;
}

.remove-button {
  display: grid;
  flex: none;
  place-items: center;
  width: 22px;
  height: 22px;
  border: 0;
  border-radius: 5px;
  background: transparent;
  color: var(--admin-muted);
  cursor: pointer;
}

.remove-button:hover {
  background: var(--admin-hover);
  color: var(--admin-danger);
}

.remove-button :deep(svg) {
  width: 13px;
  height: 13px;
}

.uploader-note {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  margin: 0;
  color: var(--admin-faint);
  font-size: 10.5px;
  line-height: 1.55;
}

.uploader-note :deep(svg) {
  flex: none;
  width: 13px;
  height: 13px;
  margin-top: 1px;
}

.uploader-footer {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 10px;
  width: 100%;
}

.uploader-summary {
  color: var(--admin-muted);
  font-size: 11.5px;
}

.uploader-actions {
  display: flex;
  gap: 8px;
  margin-left: auto;
}
</style>
