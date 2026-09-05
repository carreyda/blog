<script setup lang="ts">
definePageMeta({ layout: 'admin' })
useSeoMeta({ title: '项目管理' })

type Project = { id: number; name: string; summary: string; status: 'ACTIVE' | 'ARCHIVED' | 'SOLD' | 'BUILDING'; websiteUrl: string | null; githubUrl: string | null; techStack: string[]; sort: number }
const session = useState<{ csrfToken: string } | null>('admin-session')
const { data: response, refresh } = await useFetch<{ data: Project[] }>('/api/admin/projects')
const projects = computed(() => response.value?.data || [])
const statusItems: { label: string; value: Project['status'] }[] = [
  { label: '已上线', value: 'ACTIVE' },
  { label: '开发中', value: 'BUILDING' },
  { label: '已出售', value: 'SOLD' },
  { label: '已归档', value: 'ARCHIVED' },
]
const blank = () => ({ name: '', summary: '', status: 'ACTIVE' as Project['status'], websiteUrl: '', githubUrl: '', techStack: '', sort: 0 })
const form = reactive(blank())
const editingId = ref<number | null>(null)
const errorMessage = ref('')
const pending = ref(false)

const statusLabel = (status: Project['status']) => ({ ACTIVE: '已上线', BUILDING: '开发中', SOLD: '已出售', ARCHIVED: '已归档' })[status]
const statusColor = (status: Project['status']) => ({ ACTIVE: 'success', BUILDING: 'warning', SOLD: 'primary', ARCHIVED: 'neutral' } as const)[status]

function edit(project: Project) {
  editingId.value = project.id
  Object.assign(form, { ...project, websiteUrl: project.websiteUrl || '', githubUrl: project.githubUrl || '', techStack: project.techStack.join(', ') })
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

function reset() {
  editingId.value = null
  Object.assign(form, blank())
  errorMessage.value = ''
}

async function save() {
  if (!session.value) return
  pending.value = true
  errorMessage.value = ''
  try {
    const body = { ...form, techStack: form.techStack.split(/[,，]/).map(value => value.trim()).filter(Boolean), sort: Number(form.sort) }
    await $fetch(editingId.value ? `/api/admin/projects/${editingId.value}` : '/api/admin/projects', { method: editingId.value ? 'PUT' : 'POST', body, headers: { 'X-CSRF-Token': session.value.csrfToken } })
    reset()
    await refresh()
  } catch (error: any) {
    errorMessage.value = error?.data?.error?.message || '保存失败'
  } finally {
    pending.value = false
  }
}

async function remove(project: Project) {
  if (!session.value || !window.confirm(`确定永久删除“${project.name}”吗？`)) return
  await $fetch(`/api/admin/projects/${project.id}`, { method: 'DELETE', headers: { 'X-CSRF-Token': session.value.csrfToken } })
  await refresh()
}
</script>

<template>
  <section class="projects-page">
    <AdminPageHeader eyebrow="Portfolio" title="项目管理" description="维护首页与项目页展示的作品和产品。" />

    <div class="projects-layout">
      <UCard class="project-form-card">
        <template #header>
          <div class="card-heading"><span><UIcon :name="editingId ? 'i-lucide-pencil' : 'i-lucide-plus'" /></span><div><strong>{{ editingId ? '编辑项目' : '添加项目' }}</strong><p>{{ editingId ? '更新项目展示信息' : '创建新的作品卡片' }}</p></div></div>
        </template>
        <form class="project-form" @submit.prevent="save">
          <UFormField label="项目名称" required><UInput v-model="form.name" placeholder="项目名称" class="w-full" /></UFormField>
          <UFormField label="项目摘要" required><UTextarea v-model="form.summary" :rows="3" placeholder="用一两句话介绍项目" class="w-full" /></UFormField>
          <div class="form-row">
            <UFormField label="状态"><USelect v-model="form.status" :items="statusItems" value-key="value" class="w-full" /></UFormField>
            <UFormField label="排序"><UInput v-model.number="form.sort" type="number" class="w-full" /></UFormField>
          </div>
          <UFormField label="技术栈" hint="使用逗号分隔"><UInput v-model="form.techStack" placeholder="Nuxt, TypeScript, PostgreSQL" class="w-full" /></UFormField>
          <UFormField label="网站 URL"><UInput v-model="form.websiteUrl" icon="i-lucide-globe" placeholder="https://" class="w-full" /></UFormField>
          <UFormField label="GitHub URL"><UInput v-model="form.githubUrl" icon="i-lucide-github" placeholder="https://github.com/" class="w-full" /></UFormField>
          <UAlert v-if="errorMessage" color="error" variant="soft" :description="errorMessage" />
          <div class="form-actions"><UButton type="submit" :loading="pending" icon="i-lucide-check">{{ editingId ? '保存修改' : '添加项目' }}</UButton><UButton v-if="editingId" type="button" color="neutral" variant="ghost" @click="reset">取消</UButton></div>
        </form>
      </UCard>

      <div class="project-list">
        <div class="project-list-heading"><div><strong>全部项目</strong><p>共 {{ projects.length }} 个项目</p></div><UBadge color="neutral" variant="subtle">{{ projects.length }}</UBadge></div>
        <div v-if="projects.length" class="project-grid">
          <UCard v-for="project in projects" :key="project.id" class="project-card">
            <div class="project-card-head"><span class="project-icon"><UIcon name="i-lucide-box" /></span><UBadge :color="statusColor(project.status)" variant="subtle" size="sm">{{ statusLabel(project.status) }}</UBadge></div>
            <div class="project-copy"><strong>{{ project.name }}</strong><p>{{ project.summary }}</p></div>
            <div class="tech-list"><span v-for="tech in project.techStack" :key="tech">{{ tech }}</span><span v-if="!project.techStack.length">暂未设置技术栈</span></div>
            <div class="project-meta"><span>排序 {{ project.sort }}</span><span class="project-links"><a v-if="project.websiteUrl" :href="project.websiteUrl" target="_blank" rel="noopener noreferrer" aria-label="访问项目"><UIcon name="i-lucide-external-link" /></a><a v-if="project.githubUrl" :href="project.githubUrl" target="_blank" rel="noopener noreferrer" aria-label="查看 GitHub"><UIcon name="i-lucide-github" /></a></span></div>
            <template #footer><div class="project-actions"><UButton icon="i-lucide-pencil" size="xs" color="neutral" variant="ghost" @click="edit(project)">编辑</UButton><UButton icon="i-lucide-trash-2" size="xs" color="error" variant="ghost" @click="remove(project)">删除</UButton></div></template>
          </UCard>
        </div>
        <UCard v-else><div class="empty-state"><UIcon name="i-lucide-panels-top-left" /><strong>暂无项目</strong><p>在左侧添加第一个项目。</p></div></UCard>
      </div>
    </div>
  </section>
</template>

<style scoped>
.projects-page { display: grid; gap: 26px; }
.projects-layout { display: grid; grid-template-columns: 360px minmax(0, 1fr); gap: 22px; align-items: start; }
.project-form-card { position: sticky; top: 86px; }
.card-heading { display: flex; align-items: center; gap: 11px; }
.card-heading>span { display: grid; width: 34px; height: 34px; place-items: center; border-radius: 9px; background: color-mix(in srgb, var(--color-primary) 10%, transparent); color: var(--color-primary); }
.card-heading>span :deep(svg) { width: 15px; height: 15px; }
.card-heading strong, .project-list-heading strong { display: block; font-size: 13.5px; font-weight: 650; }
.card-heading p, .project-list-heading p { margin: 3px 0 0; color: var(--color-text-muted); font-size: 10.5px; }
.project-form { display: grid; gap: 17px; }
.form-row { display: grid; grid-template-columns: 1fr 90px; gap: 12px; }
.form-actions { display: flex; gap: 8px; padding-top: 3px; }
.project-list { display: grid; gap: 14px; }
.project-list-heading { display: flex; min-height: 36px; align-items: center; justify-content: space-between; gap: 16px; }
.project-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; }
.project-card { min-width: 0; }
.project-card-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.project-icon { display: grid; width: 36px; height: 36px; place-items: center; border: 1px solid var(--color-border); border-radius: 9px; color: var(--color-text-secondary); }
.project-icon :deep(svg) { width: 16px; height: 16px; }
.project-copy { margin-top: 18px; }
.project-copy strong { font-size: 14px; font-weight: 650; }
.project-copy p { display: -webkit-box; min-height: 42px; margin: 8px 0 0; overflow: hidden; color: var(--color-text-secondary); font-size: 11.5px; line-height: 1.65; -webkit-box-orient: vertical; -webkit-line-clamp: 2; }
.tech-list { display: flex; min-height: 26px; flex-wrap: wrap; gap: 5px; margin-top: 15px; }
.tech-list span { padding: 3px 7px; border-radius: 5px; background: var(--color-background-secondary); color: var(--color-text-secondary); font-size: 9.5px; }
.project-meta { display: flex; align-items: center; justify-content: space-between; margin-top: 15px; color: var(--color-text-muted); font-size: 10px; }
.project-links { display: flex; gap: 10px; }
.project-links a:hover { color: var(--color-primary); }
.project-links :deep(svg) { width: 14px; height: 14px; }
.project-actions { display: flex; justify-content: flex-end; gap: 3px; }
.empty-state { display: grid; min-height: 320px; place-items: center; align-content: center; gap: 8px; text-align: center; }
.empty-state>svg { width: 24px; height: 24px; margin-bottom: 4px; color: var(--color-text-muted); }
.empty-state strong { font-size: 13px; }
.empty-state p { margin: 0; color: var(--color-text-muted); font-size: 11px; }

@media (max-width: 1180px) { .project-grid { grid-template-columns: 1fr; } }
@media (max-width: 980px) { .projects-layout { grid-template-columns: 1fr; } .project-form-card { position: static; } .project-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
@media (max-width: 680px) { .project-grid { grid-template-columns: 1fr; } }
</style>
