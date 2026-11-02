<script setup lang="ts">
definePageMeta({ layout: 'admin' })
useSeoMeta({ title: '项目管理' })

type Project = { id: number; name: string; summary: string; status: 'ACTIVE' | 'ARCHIVED' | 'SOLD' | 'BUILDING'; websiteUrl: string | null; githubUrl: string | null; techStack: string[]; sort: number }
const session = useState<{ csrfToken: string } | null>('admin-session')
const { data: response, refresh } = await useFetch<{ data: Project[] }>('/api/admin/projects')
// Local copy so a drag can reorder optimistically before the request resolves.
const projects = ref<Project[]>(response.value?.data || [])
watch(() => response.value?.data, (list) => { if (list) projects.value = list })
const statusItems: { label: string; value: Project['status'] }[] = [
  { label: '已上线', value: 'ACTIVE' },
  { label: '开发中', value: 'BUILDING' },
  { label: '已出售', value: 'SOLD' },
  { label: '已归档', value: 'ARCHIVED' },
]
const blank = () => ({ name: '', summary: '', status: 'ACTIVE' as Project['status'], websiteUrl: '', githubUrl: '', techStack: '', sort: 0 })
const form = reactive(blank())
const editingId = ref<number | null>(null)
const { notifySuccess, notifyError } = useAdminFeedback()
const { confirm } = useAdminConfirm()
const deletingId = ref<number | null>(null)
const pending = ref(false)

const statusLabel = (status: Project['status']) => ({ ACTIVE: '已上线', BUILDING: '开发中', SOLD: '已出售', ARCHIVED: '已归档' })[status]
const statusColor = (status: Project['status']) => ({ ACTIVE: 'success', BUILDING: 'warning', SOLD: 'primary', ARCHIVED: 'neutral' } as const)[status]

function edit(project: Project) {
  editingId.value = project.id
  Object.assign(form, { ...project, websiteUrl: project.websiteUrl || '', githubUrl: project.githubUrl || '', techStack: project.techStack.join(', ') })
  document.querySelector('.admin-panel-body')?.scrollTo({ top: 0, behavior: 'smooth' })
}
function reset() {
  editingId.value = null
  Object.assign(form, blank())
}

/* ---------------------------------------------------------------- reordering */
const draggingId = ref<number | null>(null)
const dropTarget = ref<{ id: number; position: 'before' | 'after' } | null>(null)
const reordering = ref(false)

function clearDrag() {
  draggingId.value = null
  dropTarget.value = null
}

function onDragStart(event: DragEvent, project: Project) {
  if (reordering.value) return
  draggingId.value = project.id
  if (event.dataTransfer) {
    event.dataTransfer.effectAllowed = 'move'
    event.dataTransfer.setData('text/plain', String(project.id))
  }
}

function onDragOver(event: DragEvent, project: Project) {
  if (draggingId.value === null || draggingId.value === project.id) return
  event.preventDefault()
  if (event.dataTransfer) event.dataTransfer.dropEffect = 'move'
  const rect = (event.currentTarget as HTMLElement).getBoundingClientRect()
  // Two-column grid: the half the cursor sits in decides insert before/after.
  dropTarget.value = { id: project.id, position: event.clientX - rect.left < rect.width / 2 ? 'before' : 'after' }
}

function onDragLeave(project: Project) {
  if (dropTarget.value?.id === project.id) dropTarget.value = null
}

async function onDrop(event: DragEvent, project: Project) {
  event.preventDefault()
  const fromId = draggingId.value
  const target = dropTarget.value
  clearDrag()
  if (fromId === null || fromId === project.id || target?.id !== project.id) return

  const current = projects.value.map(item => item.id)
  const withoutDragged = current.filter(id => id !== fromId)
  const anchor = withoutDragged.indexOf(project.id)
  if (anchor < 0) return

  const insertAt = target.position === 'before' ? anchor : anchor + 1
  const next = [...withoutDragged.slice(0, insertAt), fromId, ...withoutDragged.slice(insertAt)]
  if (next.join(',') === current.join(',')) return

  await persistOrder(next)
}

async function persistOrder(ids: number[]) {
  if (!session.value) return
  const snapshot = projects.value
  projects.value = ids.map(id => snapshot.find(item => item.id === id)).filter((item): item is Project => Boolean(item))
  reordering.value = true
  try {
    await $fetch('/api/admin/projects/reorder', { method: 'PATCH', body: { ids }, headers: { 'X-CSRF-Token': session.value.csrfToken } })
    notifySuccess('排序已更新')
  } catch (error) {
    projects.value = snapshot
    notifyError(error, '保存排序失败')
  } finally {
    reordering.value = false
  }
}

async function save() {
  if (!session.value || pending.value) return
  pending.value = true
  try {
    const successMessage = editingId.value ? '项目已保存' : '项目已添加'
    const body = { ...form, techStack: form.techStack.split(/[,，]/).map(value => value.trim()).filter(Boolean), sort: Number(form.sort) }
    await $fetch(editingId.value ? `/api/admin/projects/${editingId.value}` : '/api/admin/projects', { method: editingId.value ? 'PUT' : 'POST', body, headers: { 'X-CSRF-Token': session.value.csrfToken } })
    reset()
    await refresh()
    notifySuccess(successMessage)
  } catch (error) {
    notifyError(error, '保存项目失败')
  } finally {
    pending.value = false
  }
}

async function remove(project: Project) {
  if (!session.value || deletingId.value !== null) return
  if (!(await confirm({ title: '删除项目', message: `确定永久删除“${project.name}”吗？`, confirmLabel: '删除', color: 'error' }))) return
  deletingId.value = project.id
  try {
    await $fetch(`/api/admin/projects/${project.id}`, { method: 'DELETE', headers: { 'X-CSRF-Token': session.value.csrfToken } })
    if (editingId.value === project.id) reset()
    await refresh()
    notifySuccess('项目已删除')
  } catch (error) {
    notifyError(error, '删除项目失败')
  } finally {
    deletingId.value = null
  }
}
</script>

<template>
  <section class="projects-page">
    <AdminPageHeader title="项目管理" description="维护首页与项目页展示的作品和产品。" />

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
          <div class="form-actions"><UButton type="submit" :loading="pending" icon="i-lucide-check">{{ editingId ? '保存修改' : '添加项目' }}</UButton><UButton v-if="editingId" type="button" color="neutral" variant="ghost" @click="reset">取消</UButton></div>
        </form>
      </UCard>

      <div class="project-list">
        <div class="project-list-heading"><div><strong>全部项目</strong><p>共 {{ projects.length }} 个项目</p></div><UBadge color="neutral" variant="subtle">{{ projects.length }}</UBadge></div>
        <div v-if="projects.length" class="project-grid">
          <UCard
            v-for="(project, index) in projects"
            :key="project.id"
            class="project-card"
            :class="{
              'is-dragging': draggingId === project.id,
              'is-drop-before': dropTarget?.id === project.id && dropTarget.position === 'before',
              'is-drop-after': dropTarget?.id === project.id && dropTarget.position === 'after',
            }"
            draggable="true"
            @dragstart="onDragStart($event, project)"
            @dragover="onDragOver($event, project)"
            @dragleave="onDragLeave(project)"
            @drop="onDrop($event, project)"
            @dragend="clearDrag"
          >
            <div class="project-card-head">
              <div class="project-lead">
                <span class="drag-handle" title="拖拽调整顺序" aria-hidden="true"><UIcon name="i-lucide-grip-vertical" /></span>
                <span class="project-icon"><UIcon name="i-lucide-box" /></span>
              </div>
              <UBadge :color="statusColor(project.status)" variant="subtle" size="sm">{{ statusLabel(project.status) }}</UBadge>
            </div>
            <div class="project-copy"><strong>{{ project.name }}</strong><p>{{ project.summary }}</p></div>
            <div class="tech-list"><span v-for="tech in project.techStack" :key="tech">{{ tech }}</span><span v-if="!project.techStack.length">暂未设置技术栈</span></div>
            <div class="project-meta"><span>第 {{ index + 1 }} 位</span><span class="project-links"><a v-if="project.websiteUrl" :href="project.websiteUrl" target="_blank" rel="noopener noreferrer" aria-label="访问项目"><UIcon name="i-lucide-external-link" /></a><a v-if="project.githubUrl" :href="project.githubUrl" target="_blank" rel="noopener noreferrer" aria-label="查看 GitHub"><UIcon name="i-lucide-github" /></a></span></div>
            <template #footer><div class="project-actions"><UButton icon="i-lucide-pencil" size="xs" color="neutral" variant="ghost" @click="edit(project)">编辑</UButton><UButton icon="i-lucide-trash-2" size="xs" color="error" variant="ghost" :loading="deletingId === project.id" :disabled="deletingId !== null" @click="remove(project)">删除</UButton></div></template>
          </UCard>
        </div>
        <UCard v-else><div class="empty-state"><UIcon name="i-lucide-panels-top-left" /><strong>暂无项目</strong><p>在左侧添加第一个项目。</p></div></UCard>
      </div>
    </div>
  </section>
</template>

<style scoped>
.projects-page { display: grid; gap: 12px; }
.projects-layout { display: grid; grid-template-columns: 360px minmax(0, 1fr); gap: 22px; align-items: start; }
.project-form-card { position: sticky; top: 86px; }
.card-heading { display: flex; align-items: center; gap: 12px; }
.card-heading>span { display: grid; width: 34px; height: 34px; place-items: center; border-radius: 10px; background: color-mix(in srgb, var(--color-primary) 10%, transparent); color: var(--color-primary); }
.card-heading>span :deep(svg) { width: 16px; height: 16px; }
.card-heading strong, .project-list-heading strong { display: block; font-size: 14px; font-weight: 650; }
.card-heading p, .project-list-heading p { margin: 4px 0 0; color: var(--color-text-muted); font-size: 10px; }
.project-form { display: grid; gap: 18px; }
.form-row { display: grid; grid-template-columns: 1fr 90px; gap: 12px; }
.form-actions { display: flex; gap: 8px; padding-top: 4px; }
.project-list { display: grid; gap: 14px; }
.project-list-heading { display: flex; min-height: 36px; align-items: center; justify-content: space-between; gap: 16px; }
.project-grid { display: grid; grid-template-columns: repeat(2, minmax(0, 1fr)); gap: 14px; }
.project-card { position: relative; min-width: 0; cursor: grab; }
.project-card:active { cursor: grabbing; }
.project-card.is-dragging { opacity: .45; }
.project-card.is-drop-before::before,
.project-card.is-drop-after::after {
  content: '';
  position: absolute;
  top: 8px;
  bottom: 8px;
  width: 2px;
  border-radius: 2px;
  background: var(--admin-accent, var(--color-primary));
}
.project-card.is-drop-before::before { left: 2px; }
.project-card.is-drop-after::after { right: 2px; }
.project-card-head { display: flex; align-items: center; justify-content: space-between; gap: 12px; }
.project-lead { display: flex; min-width: 0; align-items: center; gap: 8px; }
.drag-handle { display: grid; width: 20px; height: 20px; flex: none; place-items: center; color: var(--color-text-muted); }
.drag-handle :deep(svg) { width: 14px; height: 14px; }
.project-icon { display: grid; width: 36px; height: 36px; place-items: center; border: 1px solid var(--color-border); border-radius: 10px; color: var(--color-text-secondary); }
.project-icon :deep(svg) { width: 16px; height: 16px; }
.project-copy { margin-top: 18px; }
.project-copy strong { font-size: 14px; font-weight: 650; }
.project-copy p { display: -webkit-box; min-height: 42px; margin: 8px 0 0; overflow: hidden; color: var(--color-text-secondary); font-size: 12px; line-height: 1.65; -webkit-box-orient: vertical; -webkit-line-clamp: 2; }
.tech-list { display: flex; min-height: 26px; flex-wrap: wrap; gap: 6px; margin-top: 16px; }
.tech-list span { padding: 4px 8px; border-radius: 6px; background: var(--color-background-secondary); color: var(--color-text-secondary); font-size: 10px; }
.project-meta { display: flex; align-items: center; justify-content: space-between; margin-top: 16px; color: var(--color-text-muted); font-size: 10px; }
.project-links { display: flex; gap: 10px; }
.project-links a:hover { color: var(--color-primary); }
.project-links :deep(svg) { width: 14px; height: 14px; }
.project-actions { display: flex; justify-content: flex-end; gap: 4px; }
.empty-state { display: grid; min-height: 320px; place-items: center; align-content: center; gap: 8px; text-align: center; }
.empty-state>svg { width: 24px; height: 24px; margin-bottom: 4px; color: var(--color-text-muted); }
.empty-state strong { font-size: 14px; }
.empty-state p { margin: 0; color: var(--color-text-muted); font-size: 12px; }

@media (max-width: 1180px) { .project-grid { grid-template-columns: 1fr; } }
@media (max-width: 980px) { .projects-layout { grid-template-columns: 1fr; } .project-form-card { position: static; } .project-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); } }
@media (max-width: 680px) { .project-grid { grid-template-columns: 1fr; } }
</style>
