<script setup lang="ts">
import type { AdminMediaItem } from '~/composables/useAdminMedia'
import {
  ADMIN_MEDIA_PAGE_SIZE,
  formatMediaBytes,
  formatMediaDate,
  isSupportedMediaFile,
} from '~/composables/useAdminMedia'

const { items, totalBytes, loading, loadMedia, addFiles, addCroppedImage, renameItem, removeItems } = useAdminMedia()
const { notifySuccess, notifyError } = useAdminFeedback()
const { confirm } = useAdminConfirm()

onMounted(async () => {
  try {
    await loadMedia()
  }
  catch (error) {
    notifyError(error, '图片列表加载失败')
  }
})

const search = ref('')
const formatFilter = ref('ALL')
const sortBy = ref('newest')
const view = useCookie<'grid' | 'list'>('admin-media-view', {
  default: () => 'grid',
  sameSite: 'lax',
  maxAge: 60 * 60 * 24 * 365,
})
const page = ref(1)
const selectedIds = ref<number[]>([])
const isDragging = ref(false)
let dragDepth = 0

const uploadOpen = ref(false)
const previewOpen = ref(false)
const previewItem = ref<AdminMediaItem | null>(null)
const cropOpen = ref(false)
const cropTarget = ref<{ name: string; url: string } | null>(null)
const renameOpen = ref(false)
const renameTarget = ref<AdminMediaItem | null>(null)
const renameName = ref('')
const renaming = ref(false)

const formatOptions = [
  { label: '全部格式', value: 'ALL' },
  { label: 'PNG', value: 'PNG' },
  { label: 'JPG', value: 'JPG' },
  { label: 'WebP', value: 'WEBP' },
  { label: 'GIF', value: 'GIF' },
  { label: 'AVIF', value: 'AVIF' },
]

const sortOptions = [
  { label: '最新上传', value: 'newest' },
  { label: '最早上传', value: 'oldest' },
  { label: '按文件名', value: 'name' },
  { label: '按文件大小', value: 'size' },
]

const filteredItems = computed(() => {
  const keyword = search.value.trim().toLowerCase()
  const result = items.value.filter((item) => {
    const matchesKeyword = !keyword || item.name.toLowerCase().includes(keyword)
    const matchesFormat = formatFilter.value === 'ALL' || item.format === formatFilter.value
    return matchesKeyword && matchesFormat
  })

  return result.sort((a, b) => {
    if (sortBy.value === 'oldest') return Date.parse(a.createdAt) - Date.parse(b.createdAt)
    if (sortBy.value === 'name') return a.name.localeCompare(b.name, 'zh-CN')
    if (sortBy.value === 'size') return b.bytes - a.bytes
    return Date.parse(b.createdAt) - Date.parse(a.createdAt)
  })
})

const filteredCount = computed(() => filteredItems.value.length)
const totalPages = computed(() => Math.max(1, Math.ceil(filteredCount.value / ADMIN_MEDIA_PAGE_SIZE)))
const pagedItems = computed(() => filteredItems.value.slice(
  (page.value - 1) * ADMIN_MEDIA_PAGE_SIZE,
  page.value * ADMIN_MEDIA_PAGE_SIZE,
))
const selectedCount = computed(() => selectedIds.value.length)

watch([search, formatFilter, sortBy], () => {
  page.value = 1
})

watch(totalPages, (value) => {
  if (page.value > value) page.value = value
})

function isSelected(id: number): boolean {
  return selectedIds.value.includes(id)
}

function toggleSelect(id: number): void {
  const index = selectedIds.value.indexOf(id)
  if (index >= 0) selectedIds.value.splice(index, 1)
  else selectedIds.value.push(id)
}

function clearSelection(): void {
  selectedIds.value = []
}

function detachSelection(ids: number[]): void {
  const removed = new Set(ids)
  selectedIds.value = selectedIds.value.filter(id => !removed.has(id))
}

function resetFilters(): void {
  search.value = ''
  formatFilter.value = 'ALL'
  sortBy.value = 'newest'
  page.value = 1
}

function openPreview(item: AdminMediaItem): void {
  previewItem.value = item
  previewOpen.value = true
}

function cropSourceUrl(item: AdminMediaItem): string {
  // Same-origin proxy so the crop canvas is never tainted by the COS origin.
  return `/api/admin/media/${item.id}/file`
}

function openCrop(item: AdminMediaItem): void {
  cropTarget.value = { name: item.name, url: cropSourceUrl(item) }
  cropOpen.value = true
}

function openCropFromPreview(): void {
  const item = previewItem.value
  if (!item) return
  cropTarget.value = { name: item.name, url: cropSourceUrl(item) }
  cropOpen.value = true
  previewOpen.value = false
}

function openRename(item: AdminMediaItem): void {
  renameTarget.value = item
  renameName.value = item.name
  renameOpen.value = true
}

async function submitRename(): Promise<void> {
  const target = renameTarget.value
  if (!target) return

  const name = renameName.value.trim()
  if (!name) {
    notifyError(new Error('请输入图片名称'), '重命名失败')
    return
  }
  if (name === target.name) {
    renameOpen.value = false
    return
  }

  renaming.value = true
  try {
    const updated = await renameItem(target.id, name)
    if (previewItem.value?.id === updated.id) previewItem.value = updated
    renameOpen.value = false
    renameTarget.value = null
    notifySuccess('图片名称已更新')
  }
  catch (error) {
    notifyError(error, '重命名失败')
  }
  finally {
    renaming.value = false
  }
}

async function importFiles(files: File[]): Promise<void> {
  if (!files.length) return

  const supported = files.filter(isSupportedMediaFile)
  const skipped = files.length - supported.length

  if (!supported.length) {
    notifyError(new Error('仅支持 PNG / JPG / WebP / GIF / AVIF，且单张不超过 10MB'), '没有可上传的图片')
    return
  }

  try {
    const { added } = await addFiles(supported)
    if (added.length) {
      page.value = 1
      notifySuccess(`已上传 ${added.length} 张图片，链接已生成`)
    }
  }
  catch (error) {
    notifyError(error, '图片上传失败')
    return
  }

  if (skipped > 0) {
    notifyError(new Error(`${skipped} 个文件已跳过：格式不支持或超过 10MB`), '部分文件未上传')
  }
}

async function handleUploadConfirm(files: File[]): Promise<void> {
  uploadOpen.value = false
  await importFiles(files)
}

async function handleCropConfirm(payload: { blob: Blob; width: number; height: number }): Promise<void> {
  const source = cropTarget.value
  if (!source) return

  try {
    await addCroppedImage(source, payload.blob, payload.width, payload.height)
    cropOpen.value = false
    cropTarget.value = null
    page.value = 1
    notifySuccess('裁剪完成，已保存为新的图片')
  }
  catch (error) {
    notifyError(error, '裁剪图片保存失败')
  }
}

function formatDimensions(item: AdminMediaItem): string {
  return item.width && item.height ? `${item.width}×${item.height}` : '尺寸未知'
}

function downloadItem(item: AdminMediaItem): void {
  const link = document.createElement('a')
  link.href = item.url
  link.download = item.name
  link.rel = 'noopener'
  link.click()
}

async function copyLink(item: AdminMediaItem): Promise<void> {
  try {
    await navigator.clipboard.writeText(item.url)
    notifySuccess('图片链接已复制')
  }
  catch {
    notifyError(new Error('浏览器拒绝了剪贴板访问，请手动复制'), '复制失败')
  }
}

async function removeOne(item: AdminMediaItem): Promise<void> {
  const confirmed = await confirm({
    title: '删除图片',
    message: `确定删除「${item.name}」吗？删除后将同步删除对象存储中的文件，无法恢复。`,
    confirmLabel: '删除',
    color: 'error',
  })
  if (!confirmed) return

  try {
    await removeItems([item.id])
  }
  catch (error) {
    notifyError(error, '删除图片失败')
    return
  }

  detachSelection([item.id])

  const current = previewItem.value
  if (current && current.id === item.id) {
    previewOpen.value = false
    previewItem.value = null
  }

  notifySuccess('图片已删除')
}

async function removeSelected(): Promise<void> {
  if (!selectedIds.value.length) return

  const count = selectedIds.value.length
  const confirmed = await confirm({
    title: '删除所选图片',
    message: `确定删除选中的 ${count} 张图片吗？删除后将同步删除对象存储中的文件，无法恢复。`,
    confirmLabel: '删除',
    color: 'error',
  })
  if (!confirmed) return

  try {
    await removeItems([...selectedIds.value])
  }
  catch (error) {
    notifyError(error, '删除所选图片失败')
    return
  }

  clearSelection()

  const current = previewItem.value
  if (current && !items.value.some(item => item.id === current.id)) {
    previewOpen.value = false
    previewItem.value = null
  }

  notifySuccess(`已删除 ${count} 张图片`)
}

function onDragEnter(event: DragEvent): void {
  if (!event.dataTransfer?.types.includes('Files')) return
  dragDepth += 1
  isDragging.value = true
}

function onDragOver(event: DragEvent): void {
  if (!event.dataTransfer?.types.includes('Files')) return
  event.preventDefault()
  if (event.dataTransfer) event.dataTransfer.dropEffect = 'copy'
}

function onDragLeave(): void {
  dragDepth = Math.max(0, dragDepth - 1)
  if (dragDepth === 0) isDragging.value = false
}

async function onDrop(event: DragEvent): Promise<void> {
  event.preventDefault()
  dragDepth = 0
  isDragging.value = false
  const files = Array.from(event.dataTransfer?.files ?? [])
  if (files.length) await importFiles(files)
}
</script>

<template>
  <div class="media-page">
    <AdminPageHeader
      eyebrow="素材管理"
      title="图片上传"
      :description="`集中管理用于文章、封面与站点其他位置的图片。当前共 ${items.length} 张，合计 ${formatMediaBytes(totalBytes)}。`"
    >
      <template #actions>
        <UButton icon="i-lucide-upload" @click="uploadOpen = true">上传图片</UButton>
      </template>
    </AdminPageHeader>

    <section class="panel toolbar-panel">
      <div class="toolbar">
        <UInput
          v-model="search"
          icon="i-lucide-search"
          placeholder="搜索文件名…"
          size="sm"
          class="search-input"
        />
        <USelect v-model="formatFilter" :items="formatOptions" value-key="value" size="sm" class="filter-select" />
        <USelect v-model="sortBy" :items="sortOptions" value-key="value" size="sm" class="sort-select" />

        <div class="toolbar-tail">
          <span class="preview-chip">
            <UIcon name="i-lucide-cloud" />
            腾讯云 COS
          </span>
          <div class="view-toggle" role="group" aria-label="切换视图">
            <button
              type="button"
              class="view-button"
              :class="{ 'is-active': view === 'grid' }"
              title="网格视图"
              aria-label="网格视图"
              @click="view = 'grid'"
            >
              <UIcon name="i-lucide-layout-grid" />
            </button>
            <button
              type="button"
              class="view-button"
              :class="{ 'is-active': view === 'list' }"
              title="列表视图"
              aria-label="列表视图"
              @click="view = 'list'"
            >
              <UIcon name="i-lucide-list" />
            </button>
          </div>
        </div>
      </div>

      <div class="toolbar-meta">
        <span>共 <strong>{{ filteredCount }}</strong> 张图片 · 占用 <strong>{{ formatMediaBytes(totalBytes) }}</strong></span>
        <template v-if="selectedCount">
          <span class="meta-divider" />
          <span>已选 <strong>{{ selectedCount }}</strong> 张</span>
          <UButton size="xs" color="neutral" variant="ghost" @click="clearSelection">取消选择</UButton>
          <UButton size="xs" color="error" variant="subtle" icon="i-lucide-trash-2" @click="removeSelected">
            删除所选
          </UButton>
        </template>
        <span v-else class="meta-hint">支持把图片直接拖拽到列表区域加入图片库。</span>
      </div>
    </section>

    <section
      class="panel gallery-panel"
      :class="{ 'is-dragging': isDragging }"
      @dragenter.prevent="onDragEnter"
      @dragover.prevent="onDragOver"
      @dragleave.prevent="onDragLeave"
      @drop.prevent="onDrop"
    >
      <div v-if="isDragging" class="drop-overlay">
        <UIcon name="i-lucide-image-plus" />
        <strong>松开鼠标，把图片加入图片库</strong>
        <span>PNG / JPG / WebP / GIF / AVIF，单张不超过 10MB</span>
      </div>

      <div v-if="loading && !items.length" class="loading-state">
        <UIcon name="i-lucide-loader-circle" class="is-spinning" />
        <span>正在加载图片库…</span>
      </div>

      <template v-if="pagedItems.length">
        <div v-if="view === 'grid'" class="gallery-grid">
          <article
            v-for="item in pagedItems"
            :key="item.id"
            class="media-card"
            :class="{ 'is-selected': isSelected(item.id) }"
          >
            <div class="thumb-wrap">
              <button type="button" class="thumb" :aria-label="`预览 ${item.name}`" @click="openPreview(item)">
                <img :src="item.url" :alt="item.name" loading="lazy" decoding="async">
              </button>

              <label
                class="select-check"
                :class="{ 'is-checked': isSelected(item.id) }"
                :title="isSelected(item.id) ? '取消选择' : '选择图片'"
              >
                <input
                  type="checkbox"
                  class="select-input"
                  :checked="isSelected(item.id)"
                  @change="toggleSelect(item.id)"
                >
                <span class="select-visual"><UIcon name="i-lucide-check" /></span>
              </label>

              <div class="thumb-actions">
                <button type="button" class="thumb-action" title="预览" aria-label="预览" @click="openPreview(item)">
                  <UIcon name="i-lucide-eye" />
                </button>
                <button type="button" class="thumb-action" title="重命名" aria-label="重命名" @click="openRename(item)">
                  <UIcon name="i-lucide-pen-line" />
                </button>
                <button
                  type="button"
                  class="thumb-action"
                  title="复制链接"
                  aria-label="复制链接"
                  @click="copyLink(item)"
                >
                  <UIcon name="i-lucide-link-2" />
                </button>
                <button type="button" class="thumb-action" title="裁剪" aria-label="裁剪" @click="openCrop(item)">
                  <UIcon name="i-lucide-crop" />
                </button>
                <button
                  type="button"
                  class="thumb-action danger"
                  title="删除"
                  aria-label="删除"
                  @click="removeOne(item)"
                >
                  <UIcon name="i-lucide-trash-2" />
                </button>
              </div>
            </div>

            <div class="card-info">
              <button type="button" class="card-name" :title="item.name" @click="openPreview(item)">
                {{ item.name }}
              </button>
              <p class="card-meta">
                {{ item.format }} · {{ formatDimensions(item) }} · {{ formatMediaBytes(item.bytes) }}
              </p>
              <p class="card-date">{{ formatMediaDate(item.createdAt) }}</p>
            </div>
          </article>
        </div>

        <div v-else class="media-table-wrap">
          <table class="media-table">
            <thead>
              <tr>
                <th class="col-check"><span class="visually-hidden">选择</span></th>
                <th>图片</th>
                <th>格式</th>
                <th>尺寸</th>
                <th>大小</th>
                <th>上传时间</th>
                <th class="col-actions"><span class="visually-hidden">操作</span></th>
              </tr>
            </thead>
            <tbody>
              <tr
                v-for="item in pagedItems"
                :key="item.id"
                :class="{ 'is-selected': isSelected(item.id) }"
              >
                <td class="col-check">
                  <label class="select-check is-inline" :class="{ 'is-checked': isSelected(item.id) }">
                    <input
                      type="checkbox"
                      class="select-input"
                      :checked="isSelected(item.id)"
                      :aria-label="`选择 ${item.name}`"
                      @change="toggleSelect(item.id)"
                    >
                    <span class="select-visual"><UIcon name="i-lucide-check" /></span>
                  </label>
                </td>
                <td>
                  <div class="file-cell">
                    <button type="button" class="file-thumb" :aria-label="`预览 ${item.name}`" @click="openPreview(item)">
                      <img :src="item.url" :alt="item.name" loading="lazy" decoding="async">
                    </button>
                    <div class="file-text">
                      <button type="button" class="file-name" :title="item.name" @click="openPreview(item)">
                        {{ item.name }}
                      </button>
                    </div>
                  </div>
                </td>
                <td><UBadge color="neutral" variant="subtle" size="sm">{{ item.format }}</UBadge></td>
                <td class="mono">{{ formatDimensions(item) }}</td>
                <td class="mono">{{ formatMediaBytes(item.bytes) }}</td>
                <td class="mono">{{ formatMediaDate(item.createdAt) }}</td>
                <td>
                  <div class="row-actions">
                    <UButton size="xs" color="neutral" variant="ghost" icon="i-lucide-eye" aria-label="预览" @click="openPreview(item)" />
                    <UButton size="xs" color="neutral" variant="ghost" icon="i-lucide-pen-line" aria-label="重命名" @click="openRename(item)" />
                    <UButton size="xs" color="neutral" variant="ghost" icon="i-lucide-link-2" aria-label="复制链接" @click="copyLink(item)" />
                    <UButton size="xs" color="neutral" variant="ghost" icon="i-lucide-crop" aria-label="裁剪" @click="openCrop(item)" />
                    <UButton size="xs" color="error" variant="ghost" icon="i-lucide-trash-2" aria-label="删除" @click="removeOne(item)" />
                  </div>
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </template>

      <div v-else class="empty-wrap">
        <UEmpty
          :icon="items.length ? 'i-lucide-search-x' : 'i-lucide-images'"
          :title="items.length ? '没有找到匹配的图片' : '图片库还是空的'"
          :description="items.length ? '换个关键词或格式试试，也可以直接拖拽图片到页面里。' : '上传第一张图片，之后可以在文章、封面和站点其他位置复用。'"
        >
          <template #actions>
            <UButton v-if="items.length" color="neutral" variant="outline" @click="resetFilters">清除筛选</UButton>
            <UButton v-else icon="i-lucide-upload" @click="uploadOpen = true">上传图片</UButton>
          </template>
        </UEmpty>
      </div>

      <div v-if="totalPages > 1" class="pagination">
        <UPagination v-model:page="page" :total="filteredCount" :items-per-page="ADMIN_MEDIA_PAGE_SIZE" />
      </div>
    </section>

    <p class="stage-note">
      <UIcon name="i-lucide-info" />
      <span>图片存储于腾讯云 COS：上传或裁剪后立即持久化并生成可分享链接；删除时会同步清理对象存储中的文件。</span>
    </p>

    <UModal
      v-model:open="previewOpen"
      :title="previewItem?.name"
      :description="previewItem ? `${previewItem.format} · ${formatDimensions(previewItem)} · ${formatMediaBytes(previewItem.bytes)}` : undefined"
      :ui="{ content: 'max-w-4xl' }"
    >
      <template #body>
        <div v-if="previewItem" class="preview-shell">
          <div class="preview-stage">
            <img :src="previewItem.url" :alt="previewItem.name">
          </div>
          <div class="preview-details">
            <div class="detail-row">
              <span>上传时间</span>
              <strong>{{ formatMediaDate(previewItem.createdAt) }}</strong>
            </div>
            <div class="detail-row">
              <span>存储状态</span>
              <strong>腾讯云 COS</strong>
            </div>
            <div class="preview-url-row">
              <UInput :model-value="previewItem.url" readonly size="sm" class="preview-url" />
              <UButton
                color="neutral"
                variant="outline"
                icon="i-lucide-copy"
                @click="copyLink(previewItem)"
              >
                复制链接
              </UButton>
            </div>
          </div>
        </div>
      </template>

      <template #footer>
        <div v-if="previewItem" class="preview-footer-bar">
          <div class="preview-footer-left">
            <UButton color="error" variant="ghost" icon="i-lucide-trash-2" @click="removeOne(previewItem)">
              删除
            </UButton>
            <UButton color="neutral" variant="ghost" icon="i-lucide-pen-line" @click="openRename(previewItem)">
              重命名
            </UButton>
          </div>
          <div class="preview-footer-actions">
            <UButton color="neutral" variant="outline" icon="i-lucide-download" @click="downloadItem(previewItem)">
              下载
            </UButton>
            <UButton color="neutral" variant="outline" icon="i-lucide-crop" @click="openCropFromPreview">
              裁剪
            </UButton>
            <UButton icon="i-lucide-check" @click="previewOpen = false">完成</UButton>
          </div>
        </div>
      </template>
    </UModal>

    <UModal
      v-model:open="renameOpen"
      title="重命名图片"
      description="仅修改图片库中的显示名称，图片链接保持不变。"
      :ui="{ content: 'max-w-md' }"
    >
      <template #body>
        <div class="rename-form">
          <UInput
            v-model="renameName"
            placeholder="输入新的图片名称"
            maxlength="255"
            autofocus
            @keydown.enter.prevent="submitRename"
          />
          <p class="rename-hint">
            <UIcon name="i-lucide-info" />
            <span>名称只影响图片库展示与下载文件名；COS 对象地址不会变化，已插入文章的链接不受影响。</span>
          </p>
        </div>
      </template>

      <template #footer>
        <div class="rename-footer">
          <UButton color="neutral" variant="ghost" @click="renameOpen = false">取消</UButton>
          <UButton :loading="renaming" @click="submitRename">保存名称</UButton>
        </div>
      </template>
    </UModal>

    <AdminImageUploader v-model:open="uploadOpen" @confirm="handleUploadConfirm" />
    <AdminImageCropper v-model:open="cropOpen" :image="cropTarget" @confirm="handleCropConfirm" />
  </div>
</template>

<style scoped>
.media-page {
  display: flex;
  flex-direction: column;
  gap: 14px;
}

.panel {
  border: 1px solid var(--admin-border);
  border-radius: var(--admin-radius-lg);
  background: var(--admin-surface);
  box-shadow: var(--admin-shadow-sm);
}

.toolbar-panel {
  display: flex;
  flex-direction: column;
  gap: 9px;
  padding: 12px 14px;
}

.toolbar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

.search-input {
  flex: 1 1 220px;
  max-width: 320px;
}

.filter-select {
  width: 122px;
}

.sort-select {
  width: 132px;
}

.toolbar-tail {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  margin-left: auto;
}

.preview-chip {
  display: inline-flex;
  align-items: center;
  gap: 5px;
  padding: 4px 9px;
  border-radius: var(--admin-radius-pill);
  background: var(--admin-accent-soft);
  color: var(--admin-accent-text);
  font-size: 10.5px;
  font-weight: 620;
  white-space: nowrap;
}

.preview-chip :deep(svg) {
  width: 12px;
  height: 12px;
}

.view-toggle {
  display: flex;
  gap: 2px;
  padding: 2px;
  border: 1px solid var(--admin-border);
  border-radius: var(--admin-radius);
  background: var(--admin-surface-2);
}

.view-button {
  display: grid;
  place-items: center;
  width: 26px;
  height: 24px;
  padding: 0;
  border: 0;
  border-radius: 5px;
  background: transparent;
  color: var(--admin-muted);
  cursor: pointer;
  transition:
    background-color var(--admin-duration-fast) var(--admin-ease),
    color var(--admin-duration-fast) var(--admin-ease);
}

.view-button:hover {
  color: var(--admin-text);
}

.view-button.is-active {
  background: var(--admin-surface);
  color: var(--admin-text);
  box-shadow: var(--admin-shadow-sm);
}

.view-button :deep(svg) {
  width: 14px;
  height: 14px;
}

.toolbar-meta {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
  color: var(--admin-muted);
  font-size: 11.5px;
}

.toolbar-meta strong {
  color: var(--admin-text);
  font-weight: 650;
}

.meta-divider {
  width: 1px;
  height: 12px;
  background: var(--admin-border-strong);
}

.meta-hint {
  color: var(--admin-faint);
}

.gallery-panel {
  position: relative;
  display: flex;
  flex-direction: column;
  gap: 12px;
  min-height: 320px;
  padding: 14px;
}

.loading-state {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  min-height: 260px;
  color: var(--admin-muted);
  font-size: 12px;
}

.loading-state :deep(svg) {
  width: 20px;
  height: 20px;
}

.is-spinning {
  animation: media-spin 1s linear infinite;
}

@keyframes media-spin {
  to {
    transform: rotate(360deg);
  }
}

.drop-overlay {
  position: absolute;
  inset: 8px;
  z-index: 5;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 5px;
  border: 1.5px dashed var(--admin-accent);
  border-radius: var(--admin-radius-lg);
  background: color-mix(in oklab, var(--admin-surface) 88%, transparent);
  color: var(--admin-accent-text);
  text-align: center;
  pointer-events: none;
  backdrop-filter: blur(2px);
}

.drop-overlay :deep(svg) {
  width: 26px;
  height: 26px;
}

.drop-overlay strong {
  font-size: 12.5px;
  font-weight: 650;
}

.drop-overlay span {
  color: var(--admin-muted);
  font-size: 10.5px;
}

.gallery-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(196px, 1fr));
  gap: 12px;
}

.media-card {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  border: 1px solid var(--admin-border);
  border-radius: var(--admin-radius);
  background: var(--admin-surface);
  transition:
    border-color var(--admin-duration) var(--admin-ease),
    box-shadow var(--admin-duration) var(--admin-ease);
}

.media-card:hover {
  border-color: var(--admin-border-strong);
  box-shadow: var(--admin-shadow);
}

.media-card.is-selected {
  border-color: var(--admin-accent);
  box-shadow: 0 0 0 2px var(--admin-accent-ring);
}

.thumb-wrap {
  position: relative;
  overflow: hidden;
  aspect-ratio: 4 / 3;
  background: var(--admin-surface-2);
}

.thumb {
  display: block;
  width: 100%;
  height: 100%;
  padding: 0;
  border: 0;
  background: transparent;
  cursor: zoom-in;
}

.thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
  transition: transform 320ms var(--admin-ease);
}

.media-card:hover .thumb img {
  transform: scale(1.035);
}

.thumb-badge {
  position: absolute;
  bottom: 8px;
  left: 8px;
  padding: 2px 6px;
  border-radius: var(--admin-radius-xs);
  background: rgb(10 14 18 / 62%);
  color: #fff;
  font-size: 9.5px;
  letter-spacing: 0.02em;
  pointer-events: none;
  backdrop-filter: blur(4px);
}

.select-check {
  position: absolute;
  top: 8px;
  left: 8px;
  z-index: 2;
  width: 22px;
  height: 22px;
  opacity: 0;
  cursor: pointer;
  transition: opacity var(--admin-duration-fast) var(--admin-ease);
}

.thumb-wrap:hover .select-check,
.media-card.is-selected .select-check,
.select-check:focus-within {
  opacity: 1;
}

.select-check.is-inline {
  position: static;
  display: inline-flex;
  opacity: 1;
}

.select-input {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  margin: 0;
  opacity: 0;
  cursor: pointer;
}

.select-visual {
  display: grid;
  place-items: center;
  width: 22px;
  height: 22px;
  border: 1px solid rgb(255 255 255 / 55%);
  border-radius: 6px;
  background: rgb(10 14 18 / 45%);
  color: #fff;
  backdrop-filter: blur(4px);
}

.select-visual :deep(svg) {
  width: 13px;
  height: 13px;
  opacity: 0;
}

.select-check.is-checked .select-visual {
  border-color: var(--admin-accent);
  background: var(--admin-accent);
  color: var(--admin-accent-contrast);
}

.select-check.is-checked .select-visual :deep(svg) {
  opacity: 1;
}

.thumb-actions {
  position: absolute;
  right: 8px;
  bottom: 8px;
  display: flex;
  flex-wrap: wrap;
  justify-content: flex-end;
  gap: 4px;
  max-width: calc(100% - 16px);
  opacity: 0;
  transform: translateY(4px);
  transition:
    opacity var(--admin-duration-fast) var(--admin-ease),
    transform var(--admin-duration-fast) var(--admin-ease);
}

.media-card:hover .thumb-actions,
.media-card:focus-within .thumb-actions {
  opacity: 1;
  transform: none;
}

.thumb-action {
  display: grid;
  place-items: center;
  width: 26px;
  height: 26px;
  padding: 0;
  border: 1px solid rgb(255 255 255 / 22%);
  border-radius: 6px;
  background: rgb(10 14 18 / 58%);
  color: #fff;
  cursor: pointer;
  backdrop-filter: blur(6px);
  transition: background-color var(--admin-duration-fast) var(--admin-ease);
}

.thumb-action:hover {
  background: rgb(10 14 18 / 82%);
}

.thumb-action.danger:hover {
  background: color-mix(in oklab, var(--admin-danger) 82%, #000);
}

.thumb-action:disabled {
  opacity: 0.38;
  cursor: not-allowed;
}

.thumb-action :deep(svg) {
  width: 13px;
  height: 13px;
}

.card-info {
  display: flex;
  flex-direction: column;
  gap: 3px;
  padding: 9px 11px 11px;
}

.card-name {
  max-width: 100%;
  padding: 0;
  overflow: hidden;
  border: 0;
  background: transparent;
  color: var(--admin-text);
  font-size: 12px;
  font-weight: 620;
  text-align: left;
  text-overflow: ellipsis;
  white-space: nowrap;
  cursor: pointer;
}

.card-name:hover {
  color: var(--admin-accent-text);
}

.card-meta,
.card-date {
  margin: 0;
  overflow: hidden;
  color: var(--admin-faint);
  font-family: var(--admin-font-mono);
  font-size: 10px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.media-table-wrap {
  overflow-x: auto;
}

.media-table {
  width: 100%;
  border-collapse: collapse;
  font-size: 12px;
}

.media-table th {
  padding: 8px 12px;
  border-bottom: 1px solid var(--admin-border);
  color: var(--admin-faint);
  font-size: 10.5px;
  font-weight: 650;
  letter-spacing: 0.04em;
  text-align: left;
  text-transform: uppercase;
  white-space: nowrap;
}

.media-table td {
  padding: 9px 12px;
  border-bottom: 1px solid var(--admin-border);
  vertical-align: middle;
}

.media-table tbody tr:last-child td {
  border-bottom: 0;
}

.media-table tbody tr:hover {
  background: var(--admin-surface-2);
}

.media-table tbody tr.is-selected {
  background: var(--admin-accent-soft);
}

.col-check {
  width: 38px;
}

.col-actions {
  width: 140px;
}

.file-cell {
  display: flex;
  align-items: center;
  gap: 10px;
  min-width: 210px;
}

.file-thumb {
  flex: none;
  width: 42px;
  height: 42px;
  padding: 0;
  overflow: hidden;
  border: 1px solid var(--admin-border);
  border-radius: 6px;
  background: var(--admin-surface-2);
  cursor: zoom-in;
}

.file-thumb img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.file-text {
  display: flex;
  flex-direction: column;
  gap: 2px;
  min-width: 0;
}

.file-name {
  max-width: 330px;
  padding: 0;
  overflow: hidden;
  border: 0;
  background: transparent;
  color: var(--admin-text);
  font-size: 12px;
  font-weight: 600;
  text-align: left;
  text-overflow: ellipsis;
  white-space: nowrap;
  cursor: pointer;
}

.file-name:hover {
  color: var(--admin-accent-text);
}

.file-local {
  color: var(--admin-faint);
  font-size: 10px;
}

.mono {
  color: var(--admin-muted);
  font-family: var(--admin-font-mono);
  font-size: 10.5px;
  white-space: nowrap;
}

.row-actions {
  display: flex;
  justify-content: flex-end;
  gap: 1px;
}

.pagination {
  display: flex;
  justify-content: flex-end;
  padding-top: 2px;
}

.empty-wrap {
  display: flex;
  align-items: center;
  justify-content: center;
  min-height: 280px;
}

.stage-note {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  margin: 0;
  padding: 0 2px;
  color: var(--admin-faint);
  font-size: 10.5px;
  line-height: 1.6;
}

.stage-note :deep(svg) {
  flex: none;
  width: 13px;
  height: 13px;
  margin-top: 1px;
}

.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  overflow: hidden;
  clip: rect(0, 0, 0, 0);
  white-space: nowrap;
  border: 0;
}

.preview-shell {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.preview-stage {
  display: grid;
  min-height: 240px;
  max-height: 56vh;
  padding: 16px;
  overflow: hidden;
  border-radius: var(--admin-radius);
  background:
    linear-gradient(45deg, var(--admin-surface-2) 25%, transparent 25%, transparent 75%, var(--admin-surface-2) 75%),
    linear-gradient(45deg, var(--admin-surface-2) 25%, var(--admin-bg) 25%, var(--admin-bg) 75%, var(--admin-surface-2) 75%);
  background-position: 0 0, 8px 8px;
  background-size: 16px 16px;
  place-items: center;
}

.preview-stage img {
  max-width: 100%;
  max-height: 50vh;
  border-radius: 4px;
  object-fit: contain;
  box-shadow: var(--admin-shadow);
}

.preview-details {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.detail-row {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 12px;
  font-size: 11.5px;
}

.detail-row span {
  color: var(--admin-faint);
}

.detail-row strong {
  color: var(--admin-body);
  font-family: var(--admin-font-mono);
  font-size: 11px;
  font-weight: 500;
}

.preview-url-row {
  display: flex;
  gap: 8px;
}

.preview-url {
  flex: 1;
  min-width: 0;
}

.preview-note {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  margin: 0;
  color: var(--admin-faint);
  font-size: 10.5px;
  line-height: 1.55;
}

.preview-note :deep(svg) {
  flex: none;
  width: 13px;
  height: 13px;
  margin-top: 1px;
}

.preview-footer-bar {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  width: 100%;
}

.preview-footer-left {
  display: flex;
  gap: 8px;
}

.rename-form {
  display: flex;
  flex-direction: column;
  gap: 8px;
}

.rename-hint {
  display: flex;
  align-items: flex-start;
  gap: 6px;
  margin: 0;
  color: var(--admin-faint);
  font-size: 10.5px;
  line-height: 1.55;
}

.rename-hint :deep(svg) {
  flex: none;
  width: 13px;
  height: 13px;
  margin-top: 1px;
}

.rename-footer {
  display: flex;
  gap: 8px;
  justify-content: flex-end;
  width: 100%;
}

.preview-footer-actions {
  display: flex;
  gap: 8px;
  margin-left: auto;
}

@media (max-width: 640px) {
  .search-input {
    max-width: none;
  }

  .toolbar-tail {
    width: 100%;
    margin-left: 0;
  }

  .preview-chip {
    display: none;
  }

  .gallery-grid {
    grid-template-columns: repeat(auto-fill, minmax(150px, 1fr));
    gap: 8px;
  }

  .col-actions {
    width: auto;
  }
}
</style>
