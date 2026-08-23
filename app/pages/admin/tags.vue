<script setup lang="ts">
definePageMeta({ layout: 'admin' })
useSeoMeta({ title: '标签管理' })

type Tag = { id: number; name: string; slug: string; postCount: number }
const session = useState<{ csrfToken: string } | null>('admin-session')
const { data: response, refresh } = await useFetch<{ data: Tag[] }>('/api/admin/tags')
const tags = computed(() => response.value?.data || [])
const form = reactive({ name: '', slug: '' })
const editingId = ref<number | null>(null)
const pending = ref(false)
const errorMessage = ref('')

function edit(tag: Tag) {
  editingId.value = tag.id
  form.name = tag.name
  form.slug = tag.slug
  errorMessage.value = ''
}

function reset() {
  editingId.value = null
  form.name = ''
  form.slug = ''
  errorMessage.value = ''
}

async function save() {
  if (!session.value) return
  pending.value = true
  errorMessage.value = ''
  try {
    const url = editingId.value ? `/api/admin/tags/${editingId.value}` : '/api/admin/tags'
    await $fetch(url, { method: editingId.value ? 'PUT' : 'POST', body: form, headers: { 'X-CSRF-Token': session.value.csrfToken } })
    reset()
    await refresh()
  } catch (error: any) {
    errorMessage.value = error?.data?.error?.message || '保存失败，请重试'
  } finally {
    pending.value = false
  }
}

async function remove(tag: Tag) {
  if (!session.value || !window.confirm(`确定删除标签“${tag.name}”吗？文章不会被删除。`)) return
  await $fetch(`/api/admin/tags/${tag.id}`, { method: 'DELETE', headers: { 'X-CSRF-Token': session.value.csrfToken } })
  if (editingId.value === tag.id) reset()
  await refresh()
}
</script>

<template>
  <section class="tag-page">
    <header><p class="eyebrow">CONTENT</p><h1>标签管理</h1><p class="lead">管理文章使用的标签与公开链接。</p></header>
    <div class="tag-layout">
      <UCard>
        <template #header><strong>{{ editingId ? '编辑标签' : '新建标签' }}</strong></template>
        <form class="tag-form" @submit.prevent="save">
          <UFormField label="名称" required><UInput v-model="form.name" maxlength="50" class="w-full" /></UFormField>
          <UFormField label="Slug" hint="例如 nuxt 或 web-development" required><UInput v-model="form.slug" maxlength="60" class="w-full" /></UFormField>
          <UAlert v-if="errorMessage" color="error" variant="soft" :description="errorMessage" />
          <div class="buttons"><UButton type="submit" :loading="pending">{{ editingId ? '保存修改' : '创建标签' }}</UButton><UButton v-if="editingId" type="button" color="neutral" variant="ghost" @click="reset">取消</UButton></div>
        </form>
      </UCard>
      <UCard>
        <div v-if="!tags.length" class="empty">暂无标签</div>
        <div v-else class="tag-list">
          <div v-for="tag in tags" :key="tag.id" class="tag-row">
            <div><strong>{{ tag.name }}</strong><code>/tags/{{ tag.slug }}</code></div>
            <span>{{ tag.postCount }} 篇文章</span>
            <div><UButton size="sm" color="neutral" variant="ghost" @click="edit(tag)">编辑</UButton><UButton size="sm" color="error" variant="ghost" @click="remove(tag)">删除</UButton></div>
          </div>
        </div>
      </UCard>
    </div>
  </section>
</template>

<style scoped>
.tag-page{display:grid;gap:24px}.tag-page h1{margin:0}.tag-layout{display:grid;grid-template-columns:320px minmax(0,1fr);gap:24px;align-items:start}.tag-form{display:grid;gap:18px}.buttons{display:flex;gap:8px}.tag-list{display:grid}.tag-row{display:grid;grid-template-columns:1fr 100px 130px;gap:16px;align-items:center;padding:14px 0;border-bottom:1px solid var(--color-border);font-size:12px;color:var(--color-text-secondary)}.tag-row:last-child{border:0}.tag-row strong,.tag-row code{display:block}.tag-row strong{margin-bottom:5px;color:var(--color-text);font-size:14px}.empty{padding:40px;text-align:center;color:var(--color-text-secondary)}@media(max-width:800px){.tag-layout{grid-template-columns:1fr}.tag-row{grid-template-columns:1fr auto}.tag-row>span{display:none}}
</style>
