<script setup lang="ts">
const session = useState<{ csrfToken: string; user: { id: number; username: string; role: 'ADMIN' } } | null>('admin-session', () => null)
const loggingOut = ref(false)
const mobileNavOpen = ref(false)
const route = useRoute()
const navigation = [
  {
    label: '概览',
    items: [{ label: '仪表盘', to: '/admin', icon: 'i-lucide-layout-dashboard' }],
  },
  {
    label: '内容管理',
    items: [
      { label: '文章管理', to: '/admin/posts', icon: 'i-lucide-file-text' },
      { label: '标签管理', to: '/admin/tags', icon: 'i-lucide-tags' },
      { label: '项目管理', to: '/admin/projects', icon: 'i-lucide-panels-top-left' },
    ],
  },
  {
    label: '系统',
    items: [{ label: '网站设置', to: '/admin/settings', icon: 'i-lucide-settings-2' }],
  },
]
const flatNavigation = navigation.flatMap(group => group.items)
const currentPage = computed(() => {
  const match = [...flatNavigation].sort((a, b) => b.to.length - a.to.length).find(item => route.path === item.to || (item.to !== '/admin' && route.path.startsWith(`${item.to}/`)))
  if (route.path === '/admin/posts/new') return '新建文章'
  if (/^\/admin\/posts\/[^/]+\/edit\/?$/.test(route.path)) return '编辑文章'
  return match?.label || '管理后台'
})

watch(() => route.fullPath, () => { mobileNavOpen.value = false })

async function logout() {
  if (!session.value) return
  loggingOut.value = true
  try {
    await $fetch('/api/auth/logout', {
      method: 'POST',
      headers: { 'X-CSRF-Token': session.value.csrfToken },
    })
  } finally {
    session.value = null
    await navigateTo('/admin/login')
    loggingOut.value = false
  }
}
</script>

<template>
  <div class="admin-shell">
    <Transition name="admin-fade">
      <button v-if="mobileNavOpen" class="admin-overlay" aria-label="关闭导航" @click="mobileNavOpen = false" />
    </Transition>

    <aside class="admin-sidebar" :class="{ 'is-open': mobileNavOpen }">
      <div class="admin-sidebar-head">
        <NuxtLink class="admin-brand" to="/admin">
          <span class="admin-brand-mark" aria-hidden="true">//</span>
          <span><strong>Blog Admin</strong><small>Content Studio</small></span>
        </NuxtLink>
        <UButton class="admin-sidebar-close" icon="i-lucide-x" color="neutral" variant="ghost" square aria-label="关闭导航" @click="mobileNavOpen = false" />
      </div>

      <nav aria-label="后台导航">
        <section v-for="group in navigation" :key="group.label" class="admin-nav-group">
          <p>{{ group.label }}</p>
          <NuxtLink v-for="item in group.items" :key="item.to" :to="item.to" :class="{ active: route.path === item.to || (item.to !== '/admin' && route.path.startsWith(`${item.to}/`)) }">
            <UIcon :name="item.icon" aria-hidden="true" />
            <span>{{ item.label }}</span>
          </NuxtLink>
        </section>
      </nav>

      <div class="admin-sidebar-footer">
        <div class="admin-user">
          <span class="admin-avatar">{{ session?.user.username?.slice(0, 1).toUpperCase() || 'A' }}</span>
          <span><strong>{{ session?.user.username || 'Administrator' }}</strong><small>管理员</small></span>
          <UButton icon="i-lucide-log-out" color="neutral" variant="ghost" square :loading="loggingOut" aria-label="退出登录" title="退出登录" @click="logout" />
        </div>
        <ColorModeSwitcher />
      </div>
    </aside>

    <div class="admin-workspace">
      <header class="admin-topbar">
        <div class="admin-topbar-left">
          <UButton class="admin-menu-button" icon="i-lucide-menu" color="neutral" variant="ghost" square aria-label="打开导航" @click="mobileNavOpen = true" />
          <div class="admin-breadcrumb"><span>Workspace</span><i>/</i><strong>{{ currentPage }}</strong></div>
        </div>
        <UButton to="/admin/posts/new" icon="i-lucide-pen-line" size="sm">新建文章</UButton>
      </header>
      <main class="admin-main"><div class="admin-content"><slot /></div></main>
    </div>
  </div>
</template>

<style scoped>
.admin-shell { display: grid; min-height: 100vh; grid-template-columns: 248px minmax(0, 1fr); background: var(--color-background-secondary); font-family: system-ui, "PingFang SC", "Microsoft YaHei", sans-serif; }
.admin-sidebar { position: sticky; top: 0; z-index: 30; display: flex; height: 100vh; flex-direction: column; padding: 20px 16px 16px; border-right: 1px solid var(--color-border); background: var(--color-background); }
.admin-sidebar-head { display: flex; min-height: 46px; align-items: center; justify-content: space-between; padding: 0 8px; }
.admin-brand { display: flex; align-items: center; gap: 10px; }
.admin-brand-mark { color: var(--color-primary); font-family: ui-monospace, monospace; font-size: 17px; font-weight: 800; letter-spacing: -.16em; }
.admin-brand span:last-child { display: grid; gap: 1px; }
.admin-brand strong { font-size: 14px; font-weight: 720; letter-spacing: -.01em; }
.admin-brand small { color: var(--color-text-muted); font-size: 9px; letter-spacing: .08em; text-transform: uppercase; }
.admin-sidebar-close, .admin-menu-button { display: none; }
.admin-sidebar nav { display: grid; flex: 1; gap: 24px; align-content: start; margin-top: 28px; overflow-y: auto; }
.admin-nav-group { display: grid; gap: 4px; }
.admin-nav-group p { margin: 0 10px 7px; color: var(--color-text-muted); font-size: 10px; font-weight: 650; letter-spacing: .08em; }
.admin-nav-group a { display: flex; min-height: 38px; align-items: center; gap: 11px; padding: 8px 10px; border-radius: 8px; color: var(--color-text-secondary); font-size: 12.5px; font-weight: 520; transition: color .15s ease, background .15s ease; }
.admin-nav-group a :deep(svg) { width: 16px; height: 16px; }
.admin-nav-group a:hover { background: var(--color-background-secondary); color: var(--color-text); }
.admin-nav-group a.active { background: color-mix(in srgb, var(--color-primary) 10%, transparent); color: var(--color-primary); }
.admin-sidebar-footer { display: grid; gap: 14px; padding-top: 14px; border-top: 1px solid var(--color-border); }
.admin-user { display: grid; grid-template-columns: 34px minmax(0, 1fr) 32px; align-items: center; gap: 9px; }
.admin-avatar { display: grid; width: 34px; height: 34px; place-items: center; border-radius: 50%; background: var(--color-text); color: var(--color-background); font-size: 12px; font-weight: 700; }
.admin-user>span:nth-child(2) { display: grid; min-width: 0; gap: 1px; }
.admin-user strong { overflow: hidden; font-size: 12px; font-weight: 650; text-overflow: ellipsis; white-space: nowrap; }
.admin-user small { color: var(--color-text-muted); font-size: 10px; }
.admin-workspace { min-width: 0; }
.admin-topbar { position: sticky; top: 0; z-index: 20; display: flex; height: 64px; align-items: center; justify-content: space-between; gap: 16px; padding: 0 clamp(24px, 3vw, 48px); border-bottom: 1px solid var(--color-border); background: color-mix(in srgb, var(--color-background) 88%, transparent); backdrop-filter: blur(14px); }
.admin-topbar-left { display: flex; align-items: center; gap: 10px; }
.admin-breadcrumb { display: flex; align-items: center; gap: 8px; font-size: 11.5px; }
.admin-breadcrumb span, .admin-breadcrumb i { color: var(--color-text-muted); font-style: normal; }
.admin-breadcrumb strong { font-weight: 620; }
.admin-main { width: 100%; min-width: 0; padding: 38px clamp(24px, 3vw, 48px) 64px; }
.admin-content { width: min(100%, 1440px); margin-inline: auto; }
.admin-overlay { position: fixed; z-index: 25; inset: 0; border: 0; background: rgb(0 0 0 / 42%); }
.admin-fade-enter-active, .admin-fade-leave-active { transition: opacity .18s ease; }
.admin-fade-enter-from, .admin-fade-leave-to { opacity: 0; }

@media (max-width: 900px) {
  .admin-shell { grid-template-columns: 1fr; }
  .admin-sidebar { position: fixed; left: 0; width: min(86vw, 280px); transform: translateX(-102%); box-shadow: 18px 0 50px rgb(0 0 0 / 14%); transition: transform .2s ease; }
  .admin-sidebar.is-open { transform: translateX(0); }
  .admin-sidebar-close, .admin-menu-button { display: inline-flex; }
  .admin-topbar { padding-inline: 18px; }
  .admin-main { padding: 28px 18px 48px; }
}

@media (max-width: 520px) {
  .admin-breadcrumb span, .admin-breadcrumb i { display: none; }
  .admin-topbar { height: 58px; }
}
</style>
