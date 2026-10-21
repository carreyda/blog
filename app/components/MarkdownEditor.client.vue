<script setup lang="ts">
import Vditor from 'vditor'
import 'vditor/dist/index.css'
import 'vditor/dist/js/i18n/zh_CN.js'

const props = defineProps<{ modelValue: string }>()
const emit = defineEmits<{
  'update:modelValue': [value: string]
  'fullscreen-change': [value: boolean]
}>()
const container = useTemplateRef('container')
const colorMode = useColorMode()
const ready = ref(false)
const isFullscreen = ref(false)
let editor: Vditor | null = null
let fullscreenObserver: MutationObserver | null = null
const mermaidIcon = '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="3" y="3" width="6" height="5" rx="1"/><rect x="15" y="3" width="6" height="5" rx="1"/><rect x="9" y="16" width="6" height="5" rx="1"/><path d="M6 8v3h6m6-3v3h-6m0 0v5" fill="none" stroke="currentColor" stroke-width="1.8"/></svg>'

onMounted(async () => {
  await nextTick()
  if (!container.value) return
  const i18n = (window as Window & { VditorI18n?: IOptions['i18n'] }).VditorI18n
  if (!i18n) throw new Error('Vditor Chinese language pack failed to load')
  editor = new Vditor(container.value, {
    cdn: '/vendor/vditor',
    i18n,
    lang: 'zh_CN',
    value: props.modelValue,
    mode: 'sv',
    theme: colorMode.value === 'dark' ? 'dark' : 'classic',
    height: 720,
    cache: { enable: false },
    counter: { enable: true, type: 'text' },
    preview: { markdown: { toc: true }, hljs: { enable: true } },
    toolbar: [
      'headings', 'bold', 'italic', 'strike', '|',
      'list', 'ordered-list', 'check', 'outdent', 'indent', '|',
      'quote', 'link', 'table', 'code', 'inline-code',
      {
        name: 'mermaid',
        tip: '插入 Mermaid 图表',
        icon: mermaidIcon,
        click: () => editor?.insertValue('\n```mermaid\nflowchart TD\n  A[开始] --> B[结束]\n```\n'),
      },
      '|',
      'undo', 'redo', 'fullscreen', 'preview', 'outline', 'help',
    ],
    after: () => {
      ready.value = true
      if (container.value) {
        fullscreenObserver = new MutationObserver(() => {
          const value = container.value?.classList.contains('vditor--fullscreen') ?? false
          isFullscreen.value = value
          emit('fullscreen-change', value)
        })
        fullscreenObserver.observe(container.value, { attributes: true, attributeFilter: ['class'] })
      }
    },
    input: value => emit('update:modelValue', value),
  })
})

watch(() => props.modelValue, (value) => {
  if (editor && editor.getValue() !== value) editor.setValue(value)
})

watch(() => colorMode.value, (value) => {
  editor?.setTheme(value === 'dark' ? 'dark' : 'classic')
})

onBeforeUnmount(() => {
  fullscreenObserver?.disconnect()
  fullscreenObserver = null
  if (isFullscreen.value) document.body.style.overflow = ''
  editor?.destroy()
  editor = null
})

function insertImage(url: string, description: string) {
  editor?.insertValue(`![${description.replaceAll(']', '\\]')}](${url})`)
}

function toggleFullscreen() {
  editor?.vditor.element
    .querySelector<HTMLElement>('.vditor-toolbar [data-type="fullscreen"]')
    ?.click()
}

defineExpose({ insertImage, toggleFullscreen })
</script>

<template>
  <div class="markdown-editor-shell" :class="{ 'is-ready': ready }">
    <div ref="container" class="markdown-editor" />
    <button
      v-if="isFullscreen"
      type="button"
      class="fullscreen-exit"
      @click="toggleFullscreen"
    >
      <UIcon name="i-lucide-minimize-2" aria-hidden="true" />
      退出全屏
    </button>
    <div v-if="!ready" class="editor-boot" role="status" aria-live="polite">
      <UIcon name="i-lucide-loader-circle" aria-hidden="true" />
      <span>正在准备 Markdown 编辑器…</span>
    </div>
  </div>
</template>

<style scoped>
.markdown-editor-shell {
  position: relative;
  width: 100%;
  min-height: 720px;
  overflow: hidden;
  border-radius: 0 0 8px 8px;
  background: var(--color-background-secondary);
}

.markdown-editor {
  width: 100%;
  min-width: 0;
}

.editor-boot {
  position: absolute;
  z-index: 2;
  inset: 0;
  display: flex;
  align-items: center;
  justify-content: center;
  gap: 10px;
  color: var(--color-text-secondary);
  background: var(--color-background-secondary);
  font-size: 13px;
}

.fullscreen-exit {
  position: fixed;
  z-index: 10000;
  right: 20px;
  bottom: 18px;
  display: inline-flex;
  min-height: 36px;
  align-items: center;
  gap: 7px;
  padding: 0 13px;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  background: var(--color-background);
  color: var(--color-text);
  box-shadow: 0 8px 24px rgba(0, 0, 0, .18);
  font: inherit;
  font-size: 12px;
  cursor: pointer;
}

.fullscreen-exit:hover {
  border-color: var(--color-primary);
  color: var(--color-primary);
}

.fullscreen-exit svg {
  width: 15px;
  height: 15px;
}

.editor-boot svg {
  width: 18px;
  height: 18px;
  animation: editor-spin .9s linear infinite;
}

.is-ready {
  background: transparent;
}

@keyframes editor-spin {
  to { transform: rotate(360deg); }
}
</style>
