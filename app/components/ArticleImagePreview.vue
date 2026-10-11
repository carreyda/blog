<script setup lang="ts">
const props = defineProps<{ html: string }>()
const content = useTemplateRef<HTMLDivElement>('content')
const dialog = useTemplateRef<HTMLDialogElement>('dialog')
const preview = ref<{ src: string; alt: string } | null>(null)
const zoomed = ref(false)
const imageError = ref(false)
let trigger: HTMLImageElement | null = null

function prepareImages() {
  content.value?.querySelectorAll('img').forEach((image) => {
    image.tabIndex = 0
    image.setAttribute('role', 'button')
    image.setAttribute('aria-haspopup', 'dialog')
    image.setAttribute('aria-label', image.alt ? `放大预览图片：${image.alt}` : '放大预览图片')
  })
}

async function openPreview(event: MouseEvent | KeyboardEvent) {
  const image = event.target
  if (!(image instanceof HTMLImageElement)) return
  if (event instanceof MouseEvent && (event.button !== 0 || event.ctrlKey || event.metaKey || event.shiftKey || event.altKey)) return
  const src = image.currentSrc || image.src
  if (!src) return

  event.preventDefault()
  trigger = image
  zoomed.value = false
  imageError.value = false
  preview.value = { src, alt: image.alt || image.title || '' }
  await nextTick()
  if (preview.value && dialog.value?.isConnected && !dialog.value.open) dialog.value.showModal()
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Enter' || event.key === ' ') void openPreview(event)
}

function closePreview() {
  dialog.value?.close()
}

function onClose() {
  preview.value = null
  zoomed.value = false
  if (trigger?.isConnected) trigger.focus({ preventScroll: true })
  trigger = null
}

onMounted(prepareImages)
watch(() => props.html, async () => {
  closePreview()
  await nextTick()
  prepareImages()
}, { flush: 'post' })
onBeforeUnmount(closePreview)
</script>

<template>
  <div ref="content" class="markdown-body article-image-content" @click="openPreview" @keydown="onKeydown" v-html="props.html" />
  <Teleport to="body">
    <dialog ref="dialog" class="article-image-dialog" aria-label="图片放大预览" @click.self="closePreview" @close="onClose">
      <template v-if="preview">
        <div class="image-preview-toolbar">
          <span>图片预览</span>
          <div class="image-preview-actions">
            <button type="button" :aria-pressed="zoomed" :disabled="imageError" @click="zoomed = !zoomed">{{ zoomed ? '适应屏幕' : '原始尺寸' }}</button>
            <button type="button" class="image-preview-close" aria-label="关闭图片预览" title="关闭预览（Esc）" @click="closePreview">×</button>
          </div>
        </div>
        <div class="image-preview-stage" :class="{ 'is-zoomed': zoomed }" @click.self="!zoomed && closePreview()">
          <p v-if="imageError" role="alert">图片加载失败，请稍后重试。</p>
          <img v-else :src="preview.src" :alt="preview.alt" referrerpolicy="no-referrer" class="image-preview-image" @error="imageError = true">
        </div>
        <p v-if="preview.alt" class="image-preview-caption">{{ preview.alt }}</p>
      </template>
    </dialog>
  </Teleport>
</template>

<style scoped>
.article-image-content :deep(img) { cursor: zoom-in; }
.article-image-content :deep(img:focus-visible) { outline: 2px solid var(--color-primary); outline-offset: 4px; }
:global(html:has(.article-image-dialog[open])) { overflow: hidden; scrollbar-gutter: stable; }
.article-image-dialog {
  width: calc(100% - 32px);
  max-width: none;
  height: calc(100dvh - 32px);
  max-height: none;
  margin: auto;
  padding: 16px;
  border: 0;
  background: transparent;
  color: #fff;
}
.article-image-dialog[open] { display: grid; grid-template-rows: auto minmax(0, 1fr) auto; gap: 16px; }
.article-image-dialog::backdrop { background: rgb(0 0 0 / 88%); }
.image-preview-toolbar, .image-preview-actions { display: flex; align-items: center; gap: 12px; }
.image-preview-toolbar { justify-content: space-between; font-family: system-ui, sans-serif; font-size: 13px; }
.image-preview-actions button { min-height: 40px; padding: 8px 14px; border: 1px solid #ffffff40; border-radius: 8px; background: #ffffff12; color: inherit; font: inherit; cursor: pointer; }
.image-preview-actions button:hover { background: #ffffff25; }
.image-preview-actions button:focus-visible { outline: 2px solid var(--color-primary); outline-offset: 3px; }
.image-preview-actions button:disabled { opacity: .5; cursor: default; }
.image-preview-actions .image-preview-close { width: 40px; padding: 0; font-size: 26px; line-height: 1; }
.image-preview-stage { display: flex; min-width: 0; min-height: 0; align-items: center; justify-content: center; overflow: auto; overscroll-behavior: contain; }
.image-preview-image { display: block; width: auto; height: auto; max-width: 100%; max-height: 100%; object-fit: contain; }
.image-preview-stage.is-zoomed { display: block; }
.is-zoomed .image-preview-image { max-width: none; max-height: none; margin: auto; }
.image-preview-caption { max-height: 80px; margin: 0; overflow: auto; color: #ddd; font-size: 12px; line-height: 1.6; text-align: center; overflow-wrap: anywhere; }
@media (max-width: 600px) {
  .article-image-dialog { width: 100%; height: 100dvh; padding: 12px; }
  .article-image-dialog[open] { gap: 12px; }
}
</style>
