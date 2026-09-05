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
  <section class="tags-page">
    <AdminPageHeader eyebrow="Content" title="标签管理" description="组织文章内容，并维护公开标签链接。" />

    <div class="tags-layout">
      <UCard class="form-card">
        <template #header>
          <div class="card-title"><span class="title-icon"><UIcon :name="editingId ? 'i-lucide-pencil' : 'i-lucide-plus'" /></span><div><strong>{{ editingId ? '编辑标签' : '新建标签' }}</strong><p>{{ editingId ? '更新标签名称与路径' : '创建新的内容分类' }}</p></div></div>
        </template>
        <form class="tag-form" @submit.prevent="save">
          <UFormField label="标签名称" required><UInput v-model="form.name" maxlength="50" placeholder="例如：Nuxt" class="w-full" /></UFormField>
          <UFormField label="Slug" hint="用于公开页面 URL，建议使用小写英文" required><UInput v-model="form.slug" maxlength="60" placeholder="例如：nuxt" class="w-full" /></UFormField>
          <UAlert v-if="errorMessage" color="error" variant="soft" :description="errorMessage" />
          <div class="buttons"><UButton type="submit" :loading="pending" icon="i-lucide-check">{{ editingId ? '保存修改' : '创建标签' }}</UButton><UButton v-if="editingId" type="button" color="neutral" variant="ghost" @click="reset">取消</UButton></div>
        </form>
      </UCard>

      <UCard class="list-card">
        <template #header><div class="list-heading"><div><strong>全部标签</strong><p>共 {{ tags.length }} 个标签</p></div><UBadge color="neutral" variant="subtle">{{ tags.length }}</UBadge></div></template>
        <div v-if="!tags.length" class="empty-state"><UIcon name="i-lucide-tags" /><strong>暂无标签</strong><p>在左侧创建第一个内容标签。</p></div>
        <div v-else class="tag-list">
          <div class="tag-list-head"><span>标签</span><span>文章数量</span><span>操作</span></div>
          <div v-for="tag in tags" :key="tag.id" class="tag-row">
            <div class="tag-info"><span class="hash">#</span><span><strong>{{ tag.name }}</strong><code>/tags/{{ tag.slug }}</code></span></div>
            <span class="post-count">{{ tag.postCount }} 篇</span>
            <div class="row-actions"><UButton icon="i-lucide-pencil" size="xs" color="neutral" variant="ghost" square :aria-label="`编辑 ${tag.name}`" @click="edit(tag)" /><UButton icon="i-lucide-trash-2" size="xs" color="error" variant="ghost" square :aria-label="`删除 ${tag.name}`" @click="remove(tag)" /></div>
          </div>
        </div>
      </UCard>
    </div>
  </section>
</template>

<style scoped>
.tags-page { display: grid; gap: 26px; }
.tags-layout { display: grid; grid-template-columns: 340px minmax(0, 1fr); gap: 18px; align-items: start; }
.form-card { position: sticky; top: 86px; }
.card-title { display: flex; align-items: center; gap: 11px; }
.title-icon { display: grid; width: 34px; height: 34px; place-items: center; border-radius: 9px; background: color-mix(in srgb, var(--color-primary) 10%, transparent); color: var(--color-primary); }
.title-icon :deep(svg) { width: 15px; height: 15px; }
.card-title strong, .list-heading strong { display: block; font-size: 13.5px; font-weight: 650; }
.card-title p, .list-heading p { margin: 3px 0 0; color: var(--color-text-muted); font-size: 10.5px; }
.tag-form { display: grid; gap: 19px; }
.buttons { display: flex; gap: 8px; padding-top: 2px; }
.list-heading { display: flex; align-items: center; justify-content: space-between; gap: 16px; }
.tag-list { display: grid; }
.tag-list-head, .tag-row { display: grid; grid-template-columns: minmax(180px, 1fr) 100px 72px; align-items: center; gap: 16px; }
.tag-list-head { padding: 0 10px 10px; color: var(--color-text-muted); font-size: 10px; font-weight: 600; }
.tag-row { min-height: 66px; padding: 10px; border-top: 1px solid var(--color-border); }
.tag-row:hover { background: color-mix(in srgb, var(--color-background-secondary) 70%, transparent); }
.tag-info { display: flex; min-width: 0; align-items: center; gap: 11px; }
.hash { display: grid; width: 34px; height: 34px; flex: 0 0 auto; place-items: center; border: 1px solid var(--color-border); border-radius: 9px; color: var(--color-primary); font-size: 14px; font-weight: 700; }
.tag-info>span:last-child { display: grid; min-width: 0; gap: 4px; }
.tag-info strong { overflow: hidden; font-size: 12.5px; font-weight: 620; text-overflow: ellipsis; white-space: nowrap; }
.tag-info code { overflow: hidden; color: var(--color-text-muted); font-size: 10px; text-overflow: ellipsis; white-space: nowrap; }
.post-count { color: var(--color-text-secondary); font-size: 11.5px; }
.row-actions { display: flex; justify-content: flex-end; gap: 2px; }
.empty-state { display: grid; min-height: 300px; place-items: center; align-content: center; gap: 8px; text-align: center; }
.empty-state>svg { width: 24px; height: 24px; margin-bottom: 4px; color: var(--color-text-muted); }
.empty-state strong { font-size: 13px; }
.empty-state p { margin: 0; color: var(--color-text-muted); font-size: 11px; }

@media (max-width: 980px) { .tags-layout { grid-template-columns: 1fr; } .form-card { position: static; } }
@media (max-width: 600px) { .tag-list-head { display: none; } .tag-row { grid-template-columns: 1fr auto; } .post-count { display: none; } }
</style>
