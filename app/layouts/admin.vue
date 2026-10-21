<script setup lang="ts">
const session = useState<{ csrfToken: string; user: { id: number; username: string; role: 'ADMIN' } } | null>('admin-session', () => null)
const loggingOut = ref(false)
const { notifySuccess, notifyError } = useAdminFeedback()
const route = useRoute()
const router = useRouter()

const dashboardItem = { label: '仪表盘', icon: 'i-lucide-house', to: '/admin', exact: true }
const contentItems = [
  { label: '文章管理', icon: 'i-lucide-notebook-text', to: '/admin/posts' },
  { label: '标签管理', icon: 'i-lucide-tag', to: '/admin/tags' },
  { label: '项目管理', icon: 'i-lucide-panels-top-left', to: '/admin/projects' },
  { label: '收藏管理', icon: 'i-lucide-bookmark', to: '/admin/bookmarks' },
]
const navigationItems = [
  dashboardItem,
  { label: '内容管理', type: 'label' as const },
  ...contentItems,
]
const settingsItems = [
  { label: '网站设置', icon: 'i-lucide-settings', to: '/admin/settings' },
]
const flatNavigation = [dashboardItem, ...contentItems, ...settingsItems]
const currentPage = computed(() => {
  if (route.path === '/admin/posts/new') return '新建文章'
  if (/^\/admin\/posts\/[^/]+\/edit\/?$/.test(route.path)) return '编辑文章'
  const match = [...flatNavigation].sort((a, b) => b.to.length - a.to.length)
    .find(item => route.path === item.to || (item.to !== '/admin' && route.path.startsWith(`${item.to}/`)))
  return match?.label || '管理后台'
})
const userInitial = computed(() => session.value?.user.username?.slice(0, 1).toUpperCase() || 'C')

const accountItems = computed(() => [
  [
    { label: '查看博客', icon: 'i-lucide-external-link', to: '/', target: '_blank' as const },
  ],
  [
    {
      label: loggingOut.value ? '退出中…' : '退出登录',
      icon: 'i-lucide-log-out',
      color: 'error' as const,
      disabled: loggingOut.value,
      onSelect: () => { void logout() },
    },
  ],
])

onMounted(() => {
  window.setTimeout(() => {
    void import('~/components/MarkdownEditor.client.vue')

    if (!document.querySelector('link[data-vditor-lute-prefetch]')) {
      const link = document.createElement('link')
      link.rel = 'prefetch'
      link.as = 'script'
      link.href = '/vendor/vditor/dist/js/lute/lute.min.js'
      link.dataset.vditorLutePrefetch = 'true'
      document.head.appendChild(link)
    }
  }, 500)
})

async function logout() {
  if (!session.value || loggingOut.value) return
  loggingOut.value = true
  try {
    await $fetch('/api/auth/logout', { method: 'POST', headers: { 'X-CSRF-Token': session.value.csrfToken } })
    session.value = null
    await navigateTo('/admin/login')
    notifySuccess('已退出登录')
  } catch (error) {
    notifyError(error, '退出登录失败')
  } finally {
    loggingOut.value = false
  }
}
</script>

<template>
  <UDashboardGroup storage="cookie" storage-key="blog-admin" unit="px" class="admin-shell">
    <UDashboardSidebar
      collapsible
      :default-size="288"
      :min-size="240"
      :max-size="340"
      :collapsed-size="84"
      :ui="{
        root: 'admin-sidebar',
        header: 'admin-sidebar-head',
        body: 'admin-sidebar-body',
        footer: 'admin-sidebar-footer',
        content: 'admin-sidebar-drawer',
      }"
    >
      <template #header="{ collapsed }">
        <NuxtLink class="admin-brand" to="/admin" aria-label="Blog Admin">
          <span class="admin-brand-mark" aria-hidden="true">//</span>
          <strong v-if="!collapsed">Blog Admin</strong>
        </NuxtLink>
        <UDashboardSidebarCollapse class="admin-collapse-button" />
      </template>

      <template #default="{ collapsed }">
        <UNavigationMenu
          :items="navigationItems"
          orientation="vertical"
          :collapsed="collapsed"
          tooltip
          class="admin-nav-menu"
        />
        <USeparator class="admin-nav-separator" />
        <UNavigationMenu
          :items="settingsItems"
          orientation="vertical"
          :collapsed="collapsed"
          tooltip
          class="admin-nav-menu"
        />
      </template>

      <template #footer="{ collapsed }">
        <div class="admin-sidebar-footer-inner">
          <UDropdownMenu :items="accountItems" :content="{ align: 'end' }" class="admin-user-menu">
            <UButton block color="neutral" variant="ghost" class="admin-user-button">
              <UAvatar :text="userInitial" size="md" />
              <span v-if="!collapsed" class="admin-user-copy">
                <strong>{{ session?.user.username || 'Carreyda' }}</strong>
                <small>管理员</small>
              </span>
              <UIcon v-if="!collapsed" name="i-lucide-chevron-down" class="admin-user-chevron" />
            </UButton>
          </UDropdownMenu>
          <div v-if="!collapsed" class="admin-theme-switcher">
            <ColorModeSwitcher variant="admin" />
          </div>
        </div>
      </template>
    </UDashboardSidebar>

    <UDashboardPanel class="admin-workspace" :ui="{ body: 'admin-panel-body' }">
      <template #header>
        <UDashboardNavbar :toggle="false" class="admin-topbar">
          <template #left>
            <UDashboardSidebarToggle />
            <UButton class="admin-back" icon="i-lucide-arrow-left" color="neutral" variant="ghost" square aria-label="返回上一页" @click="router.back()" />
            <UIcon class="admin-crumb-arrow" name="i-lucide-chevron-right" />
            <strong class="admin-page-title">{{ currentPage }}</strong>
          </template>
          <template #right>
            <UButton v-if="route.path !== '/admin/posts/new'" to="/admin/posts/new" icon="i-lucide-pen-line" size="sm">新建文章</UButton>
          </template>
        </UDashboardNavbar>
      </template>

      <template #body>
        <div class="admin-main">
          <slot />
        </div>
      </template>
    </UDashboardPanel>
  </UDashboardGroup>

  <AdminConfirmDialog />
</template>

<style>
.admin-shell {
  --admin-border: #e1e4e8;
  --admin-bg: #fdfdfd;
  --admin-surface: #fff;
  --admin-topbar-bg: rgba(255, 255, 255, .92);
  --admin-text: #111;
  --admin-body: #34383f;
  --admin-muted: #838991;
  --admin-faint: #c5c9ce;
  --admin-hover: #f5f7fa;
  --admin-active-text: #1769e8;
  --admin-active-bg: #edf4ff;
  --admin-avatar-bg: #171717;
  --admin-avatar-text: #fff;
  --admin-menu-shadow: rgba(15, 23, 42, .12);
  color: var(--admin-text);
  background: var(--admin-bg);
  font-family: system-ui, "PingFang SC", "Microsoft YaHei", sans-serif;
}

.admin-sidebar {
  background: var(--admin-surface);
  border-color: var(--admin-border);
}

.admin-sidebar-head {
  gap: 10px;
}

.admin-sidebar[data-collapsed="true"] .admin-sidebar-head {
  gap: 2px;
  padding-inline: 8px;
}

.admin-sidebar[data-collapsed="true"] .admin-brand strong {
  display: none;
}

.admin-brand {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 9px;
  color: var(--admin-text);
}

.admin-brand-mark {
  color: var(--admin-active-text);
  font-family: ui-monospace, monospace;
  font-size: 17px;
  font-weight: 900;
  letter-spacing: -.16em;
}

.admin-brand strong {
  font-size: 16px;
  font-weight: 680;
  letter-spacing: -.02em;
  white-space: nowrap;
}

.admin-collapse-button {
  margin-left: auto;
}

.admin-sidebar-body {
  padding-top: 8px;
}

.admin-nav-menu {
  width: 100%;
}

.admin-nav-separator {
  margin-block: 10px;
}

.admin-sidebar-footer {
  padding-block: 14px;
}

.admin-sidebar-footer-inner {
  display: grid;
  width: 100%;
  gap: 12px;
}

.admin-user-menu {
  width: 100%;
}

.admin-user-button {
  justify-content: flex-start;
  padding: 6px 7px;
  font-weight: 500;
}

.admin-user-copy {
  display: grid;
  min-width: 0;
  gap: 2px;
  margin-left: 4px;
  text-align: left;
}

.admin-user-copy strong {
  overflow: hidden;
  color: var(--admin-text);
  font-size: 12.5px;
  font-weight: 650;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.admin-user-copy small {
  color: var(--admin-muted);
  font-size: 11px;
}

.admin-user-chevron {
  width: 15px;
  height: 15px;
  margin-left: auto;
  color: var(--admin-muted);
}

.admin-theme-switcher {
  width: 100%;
}

.admin-sidebar-drawer {
  background: var(--admin-surface);
}

.admin-topbar {
  background: var(--admin-topbar-bg);
  backdrop-filter: blur(14px);
}

.admin-topbar-left {
  min-width: 0;
}

.admin-page-title {
  overflow: hidden;
  color: var(--admin-text);
  font-size: 13px;
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.admin-back svg,
.admin-crumb-arrow {
  width: 15px;
  height: 15px;
}

.admin-crumb-arrow {
  color: var(--admin-faint);
}

.admin-main {
  width: min(100%, 1400px);
  min-width: 0;
  margin-inline: auto;
}

html.dark .admin-shell {
  --admin-border: #242b36;
  --admin-bg: #0d1015;
  --admin-surface: #12161d;
  --admin-topbar-bg: rgba(15, 19, 25, .86);
  --admin-text: #eef3f9;
  --admin-body: #b8c2cf;
  --admin-muted: #8a95a5;
  --admin-faint: #4b5563;
  --admin-hover: #1a2029;
  --admin-active-text: #8bb8ff;
  --admin-active-bg: rgba(96, 165, 250, .14);
  --admin-avatar-bg: #e8eef7;
  --admin-avatar-text: #11151b;
  --admin-menu-shadow: rgba(0, 0, 0, .5);
}

html.dark .admin-sidebar {
  background: linear-gradient(180deg, #141922 0%, #10141b 100%);
}

html.dark .admin-sidebar-drawer {
  background: #12161d;
}

html.dark .admin-topbar {
  box-shadow: 0 1px 0 rgba(255, 255, 255, .03);
}

@media (max-width: 1023px) {
  .admin-crumb-arrow {
    display: none;
  }
}
</style>
