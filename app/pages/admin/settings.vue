<script setup lang="ts">
type SiteSettings = {
  siteName: string
  personName: string
  siteDescription: string
  bio: string
  currentStatus: string
  email: string
  avatarUrl: string
  logoUrl: string
  techStack: string[]
  techStackText?: string
  featuredProjectCount: number
  aboutMarkdown: string
  social: Record<string, string>
  seo: { title: string; description: string; ogImage: string }
}

definePageMeta({ layout: 'admin' })
useSeoMeta({ title: '网站设置' })

const session = useState<{ csrfToken: string } | null>('admin-session')
const { data: response } = await useFetch<{ data: SiteSettings }>('/api/admin/settings')
const initial = response.value?.data
const form = reactive<SiteSettings>({
  siteName: initial?.siteName || '', personName: initial?.personName || '',
  siteDescription: initial?.siteDescription || '', bio: initial?.bio || '',
  currentStatus: initial?.currentStatus || '', email: initial?.email || '',
  avatarUrl: initial?.avatarUrl || '', logoUrl: initial?.logoUrl || '',
  techStack: initial?.techStack || [], techStackText: initial?.techStack?.join(', ') || '',
  featuredProjectCount: initial?.featuredProjectCount || 3, aboutMarkdown: initial?.aboutMarkdown || '',
  social: initial?.social || {}, seo: initial?.seo || { title: '', description: '', ogImage: '' },
})
const pending = ref(false)
const message = ref('')
const saveState = ref<'success' | 'error' | null>(null)

async function save() {
  if (!session.value || pending.value) return
  pending.value = true
  message.value = ''
  saveState.value = null
  try {
    const { techStackText, ...body } = form
    body.techStack = (techStackText || '').split(/[,，]/).map(item => item.trim()).filter(Boolean)
    await $fetch('/api/admin/settings', { method: 'PUT', body, headers: { 'X-CSRF-Token': session.value.csrfToken } })
    message.value = '设置已保存'
    saveState.value = 'success'
  } catch (error: any) {
    message.value = error?.data?.error?.message || '保存失败'
    saveState.value = 'error'
  } finally { pending.value = false }
}
</script>

<template>
  <section class="settings-page">
    <AdminPageHeader eyebrow="系统配置" title="网站设置" description="管理博客的基础资料、首页内容与默认搜索展示信息。" />
    <form class="settings-form" @submit.prevent="save">
      <div class="settings-main">
        <UCard class="settings-card">
          <template #header><div class="section-heading"><span class="section-icon"><UIcon name="i-lucide-panel-top" /></span><div><h2>基础信息</h2><p>这些信息会显示在网站标题、导航和个人介绍中。</p></div></div></template>
          <div class="fields fields--two">
            <UFormField label="网站名称"><UInput v-model="form.siteName" size="lg" class="w-full" /></UFormField>
            <UFormField label="个人名称"><UInput v-model="form.personName" size="lg" class="w-full" /></UFormField>
            <UFormField label="网站描述" class="field-wide"><UTextarea v-model="form.siteDescription" :rows="3" class="w-full" /></UFormField>
            <UFormField label="个人简介" class="field-wide"><UTextarea v-model="form.bio" :rows="4" class="w-full" /></UFormField>
            <UFormField label="当前状态"><UInput v-model="form.currentStatus" size="lg" class="w-full" /></UFormField>
            <UFormField label="联系邮箱"><UInput v-model="form.email" type="email" size="lg" class="w-full" /></UFormField>
          </div>
        </UCard>

        <UCard class="settings-card">
          <template #header><div class="section-heading"><span class="section-icon section-icon--violet"><UIcon name="i-lucide-layout-template" /></span><div><h2>首页与关于页</h2><p>配置首页内容密度与关于页面的完整介绍。</p></div></div></template>
          <div class="fields">
            <UFormField label="技术栈" description="使用中文或英文逗号分隔"><UInput v-model="form.techStackText" size="lg" class="w-full" placeholder="Vue, Nuxt, TypeScript" /></UFormField>
            <UFormField label="首页精选项目数量"><UInput v-model.number="form.featuredProjectCount" type="number" min="0" max="12" size="lg" class="w-full" /></UFormField>
            <UFormField label="关于页 Markdown"><UTextarea v-model="form.aboutMarkdown" :rows="18" autoresize class="about-editor w-full" /></UFormField>
          </div>
        </UCard>

        <UCard class="settings-card">
          <template #header><div class="section-heading"><span class="section-icon section-icon--green"><UIcon name="i-lucide-share-2" /></span><div><h2>社交链接</h2><p>维护在个人主页和页脚中展示的外部账号。</p></div></div></template>
          <div v-if="Object.keys(form.social).length" class="fields fields--two">
            <UFormField v-for="key in Object.keys(form.social)" :key="key" :label="key"><UInput v-model="form.social[key]" size="lg" class="w-full" :placeholder="`${key} URL`" /></UFormField>
          </div>
          <div v-else class="empty-section"><UIcon name="i-lucide-link-2-off" /><span>当前没有可配置的社交平台</span></div>
        </UCard>

        <UCard class="settings-card">
          <template #header><div class="section-heading"><span class="section-icon section-icon--amber"><UIcon name="i-lucide-search" /></span><div><h2>默认 SEO</h2><p>当页面没有单独配置时，将使用这里的默认信息。</p></div></div></template>
          <div class="fields">
            <UFormField label="默认 SEO 标题"><UInput v-model="form.seo.title" size="lg" class="w-full" /></UFormField>
            <UFormField label="默认 SEO 描述"><UTextarea v-model="form.seo.description" :rows="4" class="w-full" /></UFormField>
            <UFormField label="默认 OG 图片"><UInput v-model="form.seo.ogImage" size="lg" class="w-full" placeholder="https://..." /></UFormField>
          </div>
        </UCard>
      </div>

      <aside class="settings-aside">
        <UCard class="preview-card">
          <template #header><strong>品牌预览</strong></template>
          <div class="brand-preview"><div class="brand-mark"><img v-if="form.logoUrl" :src="form.logoUrl" alt="Logo 预览"><span v-else>//</span></div><div><strong>{{ form.siteName || 'Blog' }}</strong><p>{{ form.siteDescription || '你的个人博客描述' }}</p></div></div>
          <div class="profile-preview"><div class="avatar-preview"><img v-if="form.avatarUrl" :src="form.avatarUrl" alt="头像预览"><span v-else>{{ (form.personName || 'B').slice(0, 1).toUpperCase() }}</span></div><div><strong>{{ form.personName || '博主名称' }}</strong><p>{{ form.currentStatus || '当前状态' }}</p></div></div>
        </UCard>
        <UCard class="asset-card"><template #header><strong>品牌资源</strong></template><div class="fields"><UFormField label="头像 URL"><UInput v-model="form.avatarUrl" class="w-full" /></UFormField><UFormField label="Logo URL"><UInput v-model="form.logoUrl" class="w-full" /></UFormField></div></UCard>
      </aside>

      <div class="save-bar">
        <div class="save-message" :class="saveState && `save-message--${saveState}`"><UIcon v-if="saveState === 'success'" name="i-lucide-circle-check" /><UIcon v-else-if="saveState === 'error'" name="i-lucide-circle-alert" /><span>{{ message || '修改将在保存后应用到网站。' }}</span></div>
        <UButton type="submit" size="lg" icon="i-lucide-save" :loading="pending">保存设置</UButton>
      </div>
    </form>
  </section>
</template>

<style scoped>
.settings-page,.settings-form,.settings-main,.settings-aside,.fields{display:grid;gap:20px}.settings-form{grid-template-columns:minmax(0,1fr) 300px;align-items:start}.settings-main{gap:24px}.settings-aside{position:sticky;top:92px}.section-heading{display:flex;align-items:flex-start;gap:12px}.section-heading h2{margin:0;font-size:15px;font-weight:700}.section-heading p{margin:4px 0 0;color:var(--color-text-secondary);font-size:12px;line-height:1.55}.section-icon{display:grid;width:34px;height:34px;flex:0 0 auto;place-items:center;border-radius:10px;color:#2878d4;background:rgba(68,147,248,.12)}.section-icon--violet{color:#7c5bd6;background:rgba(139,92,246,.12)}.section-icon--green{color:#15866b;background:rgba(16,185,129,.12)}.section-icon--amber{color:#b87508;background:rgba(245,158,11,.14)}.fields--two{grid-template-columns:repeat(2,minmax(0,1fr))}.field-wide{grid-column:1/-1}.about-editor{font-family:ui-monospace,SFMono-Regular,Menlo,Consolas,monospace;font-size:13px;line-height:1.7}.empty-section{display:flex;min-height:88px;align-items:center;justify-content:center;gap:8px;color:var(--color-text-secondary);font-size:13px}.brand-preview{display:flex;align-items:center;gap:12px;padding-bottom:18px;border-bottom:1px solid var(--color-border)}.brand-mark{display:grid;width:42px;height:42px;overflow:hidden;place-items:center;border-radius:12px;color:#4493f8;background:rgba(68,147,248,.12);font-weight:800}.brand-mark img,.avatar-preview img{width:100%;height:100%;object-fit:cover}.brand-preview strong,.profile-preview strong{display:block;font-size:13px}.brand-preview p,.profile-preview p{margin:4px 0 0;color:var(--color-text-secondary);font-size:11px;line-height:1.45}.profile-preview{display:flex;align-items:center;gap:10px;padding-top:18px}.avatar-preview{display:grid;width:34px;height:34px;overflow:hidden;place-items:center;border-radius:50%;color:#fff;background:linear-gradient(135deg,#4493f8,#7567d9);font-size:12px;font-weight:700}.save-bar{position:sticky;z-index:5;bottom:16px;grid-column:1/-1;display:flex;align-items:center;justify-content:space-between;gap:16px;padding:12px 14px 12px 18px;border:1px solid var(--color-border);border-radius:14px;background:color-mix(in srgb,var(--color-background) 92%,transparent);box-shadow:0 12px 36px rgba(15,23,42,.1);backdrop-filter:blur(18px)}.save-message{display:flex;align-items:center;gap:8px;color:var(--color-text-secondary);font-size:12px}.save-message--success{color:#168568}.save-message--error{color:#d14545}@media(max-width:1100px){.settings-form{grid-template-columns:1fr}.settings-aside{position:static;grid-template-columns:repeat(2,minmax(0,1fr))}}@media(max-width:680px){.fields--two,.settings-aside{grid-template-columns:1fr}.field-wide{grid-column:auto}.save-bar{bottom:8px}.save-message{display:none}.save-bar :deep(button){width:100%;justify-content:center}}
</style>
