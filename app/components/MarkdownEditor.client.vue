<script setup lang="ts">
import 'vditor/dist/index.css'
import type VditorType from 'vditor'

const props = defineProps<{ modelValue: string }>()
const emit = defineEmits<{ 'update:modelValue': [value: string] }>()
const container = useTemplateRef('container')
let editor: VditorType | null = null

onMounted(async () => {
  const [{ default: Vditor }] = await Promise.all([
    import('vditor'),
    import('vditor/dist/js/i18n/zh_CN.js'),
  ])
  if (!container.value) return
  const i18n = (window as Window & { VditorI18n?: IOptions['i18n'] }).VditorI18n
  if (!i18n) throw new Error('Vditor Chinese language pack failed to load')
  editor = new Vditor(container.value, {
    cdn: '/vendor/vditor',
    i18n,
    lang: 'zh_CN',
    value: props.modelValue,
    mode: 'sv',
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
    input: value => emit('update:modelValue', value),
  })
})

watch(() => props.modelValue, (value) => {
  if (editor && editor.getValue() !== value) editor.setValue(value)
})

onBeforeUnmount(() => editor?.destroy())

function insertImage(url: string, description: string) {
  editor?.insertValue(`![${description.replaceAll(']', '\\]')}](${url})`)
}

defineExpose({ insertImage })
</script>

<template><div ref="container" class="markdown-editor" /></template>

<style scoped>
.markdown-editor { width: 100%; min-width: 0; }
</style>
