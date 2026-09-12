<script setup lang="ts">
import Vditor from 'vditor'
import 'vditor/dist/index.css'
import 'vditor/dist/js/i18n/zh_CN.js'

const props = defineProps<{ modelValue: string }>()
const emit = defineEmits<{ 'update:modelValue': [value: string] }>()
const container = useTemplateRef('container')
const colorMode = useColorMode()
const ready = ref(false)
let editor: Vditor | null = null

onMounted(() => {
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
      'quote', 'link', 'table', 'code', 'inline-code', '|',
      'undo', 'redo', 'fullscreen', 'preview', 'outline', 'help',
    ],
    after: () => {
      ready.value = true
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
  editor?.destroy()
  editor = null
})

function insertImage(url: string, description: string) {
  editor?.insertValue(`![${description.replaceAll(']', '\\]')}](${url})`)
}

defineExpose({ insertImage })
</script>

<template>
  <div class="markdown-editor-shell" :class="{ 'is-ready': ready }">
    <div ref="container" class="markdown-editor" />
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
