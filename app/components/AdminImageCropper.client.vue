<script setup lang="ts">
import { Cropper } from 'vue-advanced-cropper'
import type { CropperResult } from 'vue-advanced-cropper'
import 'vue-advanced-cropper/dist/style.css'

const props = defineProps<{
  open: boolean
  image: { name: string; url: string } | null
}>()

const emit = defineEmits<{
  'update:open': [value: boolean]
  confirm: [payload: { blob: Blob; width: number; height: number }]
}>()

interface CropperApi {
  getResult: () => CropperResult
  zoom: (factor: number, center?: { left: number; top: number }) => void
  rotate: (angle: number) => void
  reset: () => void
  refresh: () => void
}

type AspectKey = 'free' | '1:1' | '4:3' | '16:9' | '3:4'

const ASPECT_OPTIONS: { key: AspectKey; label: string; ratio?: number }[] = [
  { key: 'free', label: '自由' },
  { key: '1:1', label: '1:1', ratio: 1 },
  { key: '4:3', label: '4:3', ratio: 4 / 3 },
  { key: '16:9', label: '16:9', ratio: 16 / 9 },
  { key: '3:4', label: '3:4', ratio: 3 / 4 },
]

const cropperRef = useTemplateRef<CropperApi>('cropper')
const aspectKey = ref<AspectKey>('free')
const rotation = ref(0)
const ready = ref(false)
const failed = ref(false)
const busy = ref(false)
const output = ref<{ width: number; height: number } | null>(null)

const openModel = computed({
  get: () => props.open,
  set: (value: boolean) => emit('update:open', value),
})

const stencilProps = computed<{ aspectRatio?: number }>(() => {
  const option = ASPECT_OPTIONS.find(item => item.key === aspectKey.value)
  return option?.ratio ? { aspectRatio: option.ratio } : {}
})

watch(() => props.open, (open) => {
  if (open) resetCropState()
})

function resetCropState(): void {
  aspectKey.value = 'free'
  rotation.value = 0
  ready.value = false
  failed.value = false
  busy.value = false
  output.value = null
}

function onReady(): void {
  ready.value = true
  failed.value = false
}

function onError(): void {
  ready.value = false
  failed.value = true
}

function onChange(payload: { canvas?: HTMLCanvasElement }): void {
  if (payload?.canvas) output.value = { width: payload.canvas.width, height: payload.canvas.height }
}

function zoom(factor: number): void {
  cropperRef.value?.zoom(factor)
}

function rotate(step: number): void {
  // vue-advanced-cropper's rotate() is incremental — pass the delta, keep the
  // displayed angle in sync for the reset button.
  rotation.value = (rotation.value + step + 360) % 360
  cropperRef.value?.rotate(step)
}

function resetTransform(): void {
  rotation.value = 0
  cropperRef.value?.reset()
}

function close(): void {
  emit('update:open', false)
}

function confirm(): void {
  const result = cropperRef.value?.getResult()
  if (!result?.canvas) {
    failed.value = true
    return
  }

  const canvas = result.canvas
  busy.value = true
  canvas.toBlob((blob) => {
    busy.value = false
    if (!blob) {
      failed.value = true
      return
    }
    emit('confirm', { blob, width: canvas.width, height: canvas.height })
    close()
  }, 'image/png', 0.92)
}
</script>

<template>
  <UModal
    v-model:open="openModel"
    title="裁剪图片"
    :description="props.image?.name ?? '拖动选框调整裁剪区域'"
    :ui="{ content: 'max-w-3xl' }"
  >
    <template #body>
      <div class="cropper-shell">
        <div class="cropper-stage">
          <Cropper
            v-if="props.image"
            ref="cropper"
            :key="props.image.url"
            class="cropper"
            :src="props.image.url"
            :stencil-props="stencilProps"
            :image-restriction="'fit-area'"
            :transitions="false"
            @ready="onReady"
            @error="onError"
            @change="onChange"
          />
          <div v-if="!ready && !failed" class="cropper-placeholder">
            <UIcon name="i-lucide-loader-circle" class="is-spinning" />
            <span>正在加载图片…</span>
          </div>
          <div v-else-if="failed" class="cropper-placeholder">
            <UIcon name="i-lucide-image-off" />
            <span>图片加载失败，请关闭后重试。</span>
          </div>
        </div>

        <div class="cropper-controls">
          <div class="control-row">
            <span class="control-label">裁剪比例</span>
            <div class="ratio-row">
              <button
                v-for="option in ASPECT_OPTIONS"
                :key="option.key"
                type="button"
                class="ratio-button"
                :class="{ 'is-active': aspectKey === option.key }"
                @click="aspectKey = option.key"
              >
                {{ option.label }}
              </button>
            </div>
          </div>

          <div class="control-row">
            <span class="control-label">调整</span>
            <div class="tool-row">
              <UButton size="xs" color="neutral" variant="soft" icon="i-lucide-zoom-out" aria-label="缩小" @click="zoom(0.9)" />
              <UButton size="xs" color="neutral" variant="soft" icon="i-lucide-zoom-in" aria-label="放大" @click="zoom(1.1)" />
              <span class="tool-divider" />
              <UButton size="xs" color="neutral" variant="soft" icon="i-lucide-rotate-ccw" aria-label="向左旋转" @click="rotate(-90)" />
              <UButton size="xs" color="neutral" variant="soft" icon="i-lucide-rotate-cw" aria-label="向右旋转" @click="rotate(90)" />
              <span class="tool-divider" />
              <UButton size="xs" color="neutral" variant="subtle" icon="i-lucide-refresh-ccw" @click="resetTransform">重置</UButton>
            </div>
          </div>
        </div>
      </div>
    </template>

    <template #footer>
      <div class="cropper-footer">
        <span class="cropper-output">
          {{ output ? `输出尺寸 ${output.width} × ${output.height} px` : '拖动图片选择要保留的区域' }}
        </span>
        <div class="cropper-actions">
          <UButton color="neutral" variant="ghost" @click="close">取消</UButton>
          <UButton icon="i-lucide-crop" :loading="busy" :disabled="!ready" @click="confirm">应用裁剪</UButton>
        </div>
      </div>
    </template>
  </UModal>
</template>

<style scoped>
.cropper-shell {
  display: flex;
  flex-direction: column;
  gap: 12px;
}

.cropper-stage {
  position: relative;
  height: 408px;
  overflow: hidden;
  border-radius: var(--admin-radius-lg);
  background: #0b0f12;
}

.cropper {
  width: 100%;
  height: 100%;
}

.cropper :deep(.vue-advanced-cropper) {
  background: #0b0f12;
}

.cropper :deep(.vue-simple-handler) {
  width: 12px;
  height: 12px;
  border: 2px solid #fff;
  border-radius: 999px;
  background: var(--admin-accent);
}

.cropper :deep(.vue-simple-line) {
  border-color: rgb(255 255 255 / 42%);
}

.cropper :deep(.vue-rectangle-stencil) {
  border: 1px solid rgb(255 255 255 / 62%);
}

.cropper-placeholder {
  position: absolute;
  inset: 0;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  gap: 8px;
  background: rgb(11 15 18 / 88%);
  color: rgb(255 255 255 / 72%);
  font-size: 12px;
}

.cropper-placeholder :deep(svg) {
  width: 22px;
  height: 22px;
}

.is-spinning {
  animation: cropper-spin 1s linear infinite;
}

@keyframes cropper-spin {
  to {
    transform: rotate(360deg);
  }
}

.cropper-controls {
  display: flex;
  flex-direction: column;
  gap: 8px;
  padding: 10px 12px;
  border: 1px solid var(--admin-border);
  border-radius: var(--admin-radius);
  background: var(--admin-surface-2);
}

.control-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 8px;
}

.control-label {
  width: 58px;
  flex: none;
  color: var(--admin-muted);
  font-size: 11px;
  font-weight: 600;
  letter-spacing: 0.02em;
}

.ratio-row {
  display: flex;
  flex-wrap: wrap;
  gap: 4px;
}

.ratio-button {
  min-width: 40px;
  padding: 3px 8px;
  border: 1px solid var(--admin-border);
  border-radius: var(--admin-radius-xs);
  background: var(--admin-surface);
  color: var(--admin-body);
  font-family: var(--admin-font-mono);
  font-size: 10.5px;
  cursor: pointer;
  transition:
    border-color var(--admin-duration-fast) var(--admin-ease),
    background-color var(--admin-duration-fast) var(--admin-ease);
}

.ratio-button:hover {
  border-color: var(--admin-border-strong);
}

.ratio-button.is-active {
  border-color: var(--admin-accent);
  background: var(--admin-accent-soft);
  color: var(--admin-accent-text);
}

.tool-row {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 6px;
}

.tool-divider {
  width: 1px;
  height: 14px;
  margin: 0 2px;
  background: var(--admin-border-strong);
}

.cropper-footer {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: space-between;
  gap: 10px;
  width: 100%;
}

.cropper-output {
  color: var(--admin-muted);
  font-family: var(--admin-font-mono);
  font-size: 10.5px;
}

.cropper-actions {
  display: flex;
  gap: 8px;
  margin-left: auto;
}
</style>
