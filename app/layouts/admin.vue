<script setup lang="ts">
const route = useRoute()
const session = useState<{ csrfToken: string; user: { id: number; username: string; role: 'ADMIN' } } | null>('admin-session', () => null)
const { accent, current: currentAccent, accents, setAccent } = useAdminAccent()

const collapsed = useCookie<boolean>('admin-sidebar-collapsed', {
  default: () => false,
  sameSite: 'lax',
  maxAge: 60 * 60 * 24 * 365,
})
const mobileOpen = ref(false)
const openMenu = ref<'account' | 'accent' | null>(null)
const menuRoot = ref<HTMLElement | null>(null)
const isFullscreen = ref(false)

// Same avatar the public site renders (site settings → /favicon.png fallback).
const { data: siteSettings } = await useFetch<{ data: { avatarUrl: string | null; personName: string } }>('/api/settings', {
  key: 'admin-site-settings',
})
const avatarUrl = computed(() => siteSettings.value?.data?.avatarUrl || '/favicon.png')
const avatarBroken = ref(false)


interface NavItem {
  label: string
  to: string
  icon: string
}

const contentNav: NavItem[] = [
  { label: '工作台', to: '/admin', icon: 'i-lucide-house' },
  { label: '文章管理', to: '/admin/posts', icon: 'i-lucide-notebook-text' },
  { label: '标签管理', to: '/admin/tags', icon: 'i-lucide-tag' },
  { label: '项目管理', to: '/admin/projects', icon: 'i-lucide-panels-top-left' },
  { label: '收藏管理', to: '/admin/bookmarks', icon: 'i-lucide-bookmark' },
]

const settingsNav: NavItem[] = [
  { label: '网站设置', to: '/admin/settings', icon: 'i-lucide-settings' },
]

const allNav = [...contentNav, ...settingsNav]

const currentPage = computed(() => {
  const path = route.path.replace(/\/$/, '') || '/admin'
  if (path === '/admin/posts/new') return '新建文章'
  if (/^\/admin\/posts\/[^/]+\/edit$/.test(path)) return '编辑文章'
  const matched = allNav.find(item => item.to === path)
  if (matched) return matched.label
  return allNav
    .filter(item => item.to !== '/admin' && path.startsWith(item.to))
    .sort((a, b) => b.to.length - a.to.length)[0]?.label ?? '管理后台'
})

const breadcrumb = computed<{ label: string; to?: string }[]>(() => {
  const path = route.path.replace(/\/$/, '') || '/admin'
  const home = { label: '首页', to: '/admin' }
  if (path === '/admin/posts/new') return [home, { label: '文章管理', to: '/admin/posts' }, { label: '新建文章' }]
  if (/^\/admin\/posts\/[^/]+\/edit$/.test(path)) return [home, { label: '文章管理', to: '/admin/posts' }, { label: '编辑文章' }]
  if (path === '/admin') return [home, { label: currentPage.value }]
  return [home, { label: currentPage.value }]
})

const isActive = (item: NavItem) => {
  const path = route.path.replace(/\/$/, '') || '/admin'
  if (item.to === '/admin') return path === '/admin'
  return path === item.to || path.startsWith(`${item.to}/`)
}

const displayName = computed(() => session.value?.user.username ?? '管理员')
const avatarLetter = computed(() => displayName.value.slice(0, 1).toUpperCase())
const showNewPost = computed(() => route.path === '/admin')

function closeMenus() {
  openMenu.value = null
}

function toggleMenu(name: 'account' | 'accent') {
  openMenu.value = openMenu.value === name ? null : name
}

function pickAccent(id: typeof accent.value) {
  setAccent(id)
  closeMenus()
}

function toggleSidebar() {
  if (window.matchMedia('(max-width: 920px)').matches) {
    mobileOpen.value = !mobileOpen.value
    return
  }
  collapsed.value = !collapsed.value
}

function refresh() {
  window.location.reload()
}

async function toggleFullscreen() {
  try {
    if (document.fullscreenElement) await document.exitFullscreen()
    else await document.documentElement.requestFullscreen()
  } catch {
    // The browser refused (unsupported or blocked by permissions); nothing to do.
  }
}

async function logout() {
  closeMenus()
  const csrfToken = session.value?.csrfToken
  try {
    await $fetch('/api/auth/logout', {
      method: 'POST',
      headers: csrfToken ? { 'X-CSRF-Token': csrfToken } : undefined,
    })
  } finally {
    session.value = null
    await navigateTo('/admin/login')
  }
}

function onDocumentClick(event: MouseEvent) {
  if (!openMenu.value) return
  if (!menuRoot.value?.contains(event.target as Node)) closeMenus()
}

function onFullscreenChange() {
  isFullscreen.value = Boolean(document.fullscreenElement)
}

function onKeydown(event: KeyboardEvent) {
  if (event.key === 'Escape') {
    closeMenus()
    mobileOpen.value = false
  }
}

watch(() => route.fullPath, () => {
  closeMenus()
  mobileOpen.value = false
})

onMounted(() => {
  document.addEventListener('click', onDocumentClick)
  document.addEventListener('fullscreenchange', onFullscreenChange)
  document.addEventListener('keydown', onKeydown)

  // Warm the editor bundle and the Vditor runtime so opening a post is instant.
  window.setTimeout(() => {
    import('~/components/MarkdownEditor.client.vue').catch(() => {})
    const link = document.createElement('link')
    link.rel = 'prefetch'
    link.as = 'script'
    link.href = '/vendor/vditor/dist/js/lute/lute.min.js'
    document.head.appendChild(link)
  }, 400)
})

onBeforeUnmount(() => {
  document.removeEventListener('click', onDocumentClick)
  document.removeEventListener('fullscreenchange', onFullscreenChange)
  document.removeEventListener('keydown', onKeydown)
})
</script>

<template>
  <div class="admin">
    <svg class="icon-sprite" aria-hidden="true" focusable="false">
      <symbol id="ic-panel" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M9 3v18" /><path d="m16 15-3-3 3-3" /></symbol>
      <symbol id="ic-panel-open" viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="2" /><path d="M9 3v18" /><path d="m14 9 3 3-3 3" /></symbol>
      <symbol id="ic-refresh" viewBox="0 0 24 24"><path d="M3 12a9 9 0 0 1 9-9 9.75 9.75 0 0 1 6.74 2.74L21 8" /><path d="M21 3v5h-5" /><path d="M21 12a9 9 0 0 1-9 9 9.75 9.75 0 0 1-6.74-2.74L3 16" /><path d="M8 16H3v5" /></symbol>
      <symbol id="ic-max" viewBox="0 0 24 24"><path d="M8 3H5a2 2 0 0 0-2 2v3" /><path d="M21 8V5a2 2 0 0 0-2-2h-3" /><path d="M3 16v3a2 2 0 0 0 2 2h3" /><path d="M16 21h3a2 2 0 0 0 2-2v-3" /></symbol>
      <symbol id="ic-min" viewBox="0 0 24 24"><path d="M8 3v3a2 2 0 0 1-2 2H3" /><path d="M21 8h-3a2 2 0 0 1-2-2V3" /><path d="M3 16h3a2 2 0 0 1 2 2v3" /><path d="M16 21v-3a2 2 0 0 1 2-2h3" /></symbol>
      <symbol id="ic-bell" viewBox="0 0 24 24"><path d="M10.268 21a2 2 0 0 0 3.464 0" /><path d="M3.262 15.326A1 1 0 0 0 4 17h16a1 1 0 0 0 .74-1.673C19.41 13.956 18 12.499 18 8A6 6 0 0 0 6 8c0 4.499-1.411 5.956-2.738 7.326" /></symbol>
      <symbol id="ic-chevron" viewBox="0 0 24 24"><path d="m6 9 6 6 6-6" /></symbol>
      <symbol id="ic-logout" viewBox="0 0 24 24"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4" /><path d="m16 17 5-5-5-5" /><path d="M21 12H9" /></symbol>
      <symbol id="ic-external" viewBox="0 0 24 24"><path d="M15 3h6v6" /><path d="M10 14 21 3" /><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6" /></symbol>
      <symbol id="ic-plus" viewBox="0 0 24 24"><path d="M5 12h14" /><path d="M12 5v14" /></symbol>
      <symbol id="ic-check" viewBox="0 0 24 24"><path d="M20 6 9 17l-5-5" /></symbol>
      <symbol id="ic-palette" viewBox="0 0 24 24"><circle cx="13.5" cy="6.5" r=".5" fill="currentColor" /><circle cx="17.5" cy="10.5" r=".5" fill="currentColor" /><circle cx="8.5" cy="7.5" r=".5" fill="currentColor" /><circle cx="6.5" cy="12.5" r=".5" fill="currentColor" /><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 0 1 1.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z" /></symbol>
    </svg>

    <aside class="admin-side" :class="{ 'is-collapsed': collapsed, 'is-open': mobileOpen }">
      <div class="side-head">
        <NuxtLink to="/admin" class="brand" @click="mobileOpen = false">
          <span class="brand-mark">CB</span>
          <span v-if="!collapsed" class="brand-text">
            <strong>Carreyda Blog</strong>
            <small>内容工作台</small>
          </span>
        </NuxtLink>
        <span v-if="!collapsed" class="brand-dot" aria-hidden="true" />
      </div>

      <nav class="side-nav" aria-label="后台导航">
        <p v-if="!collapsed" class="nav-label">内容管理</p>
        <NuxtLink
          v-for="item in contentNav"
          :key="item.to"
          :to="item.to"
          class="nav-item"
          :class="{ 'is-active': isActive(item) }"
          :title="collapsed ? item.label : undefined"
          @click="mobileOpen = false"
        >
          <UIcon :name="item.icon" class="nav-icon" />
          <span v-if="!collapsed" class="nav-text">{{ item.label }}</span>
        </NuxtLink>

        <p v-if="!collapsed" class="nav-label nav-label--spaced">站点</p>
        <NuxtLink
          v-for="item in settingsNav"
          :key="item.to"
          :to="item.to"
          class="nav-item"
          :class="{ 'is-active': isActive(item) }"
          :title="collapsed ? item.label : undefined"
          @click="mobileOpen = false"
        >
          <UIcon :name="item.icon" class="nav-icon" />
          <span v-if="!collapsed" class="nav-text">{{ item.label }}</span>
        </NuxtLink>
      </nav>

      <div class="side-foot">
        <NuxtLink to="/" target="_blank" class="nav-item nav-item--ghost" :title="collapsed ? '查看博客' : undefined">
          <svg class="ic" aria-hidden="true"><use href="#ic-external" /></svg>
          <span v-if="!collapsed" class="nav-text">查看博客</span>
        </NuxtLink>
      </div>
    </aside>

    <div v-if="mobileOpen" class="admin-backdrop" @click="mobileOpen = false" />

    <div class="admin-main">
      <header class="admin-topbar">
        <button type="button" class="icon-btn" :aria-label="collapsed ? '展开侧栏' : '收起侧栏'" @click="toggleSidebar">
          <svg class="ic" aria-hidden="true"><use :href="collapsed ? '#ic-panel-open' : '#ic-panel'" /></svg>
        </button>
        <button type="button" class="icon-btn" aria-label="刷新页面" @click="refresh">
          <svg class="ic" aria-hidden="true"><use href="#ic-refresh" /></svg>
        </button>

        <nav class="crumb" aria-label="面包屑">
          <template v-for="(crumb, index) in breadcrumb" :key="crumb.label">
            <span v-if="index > 0" class="crumb-sep" aria-hidden="true">/</span>
            <NuxtLink v-if="crumb.to && index < breadcrumb.length - 1" :to="crumb.to" class="crumb-link">{{ crumb.label }}</NuxtLink>
            <span v-else class="crumb-current" :aria-current="index === breadcrumb.length - 1 ? 'page' : undefined">{{ crumb.label }}</span>
          </template>
        </nav>

        <div ref="menuRoot" class="topbar-right">
          <button type="button" class="icon-btn" :aria-label="isFullscreen ? '退出全屏' : '全屏'" @click="toggleFullscreen">
            <svg class="ic" aria-hidden="true"><use :href="isFullscreen ? '#ic-min' : '#ic-max'" /></svg>
          </button>

          <div class="menu-wrap">
            <button type="button" class="icon-btn icon-btn--dot" aria-label="通知" title="通知（即将上线）" @click="closeMenus">
              <svg class="ic" aria-hidden="true"><use href="#ic-bell" /></svg>
              <span class="unread-dot" aria-hidden="true" />
            </button>
          </div>

          <div class="menu-wrap">
            <button type="button" class="icon-btn" aria-label="主题色" :aria-expanded="openMenu === 'accent'" @click="toggleMenu('accent')">
              <svg class="ic" aria-hidden="true"><use href="#ic-palette" /></svg>
            </button>
            <div v-if="openMenu === 'accent'" class="menu menu--swatches" role="menu">
              <button
                v-for="item in accents"
                :key="item.id"
                type="button"
                class="swatch"
                :class="{ 'is-active': item.id === currentAccent.id }"
                role="menuitemradio"
                :aria-checked="item.id === currentAccent.id"
                @click="pickAccent(item.id)"
              >
                <span class="swatch-dot" :style="{ background: item.swatch }" />
                <span class="swatch-label">{{ item.label }}</span>
                <svg v-if="item.id === currentAccent.id" class="ic swatch-check" aria-hidden="true"><use href="#ic-check" /></svg>
              </button>
            </div>
          </div>

          <div class="mode-switch"><ColorModeSwitcher /></div>

          <NuxtLink v-if="showNewPost" to="/admin/posts/new" class="btn-primary">
            <svg class="ic" aria-hidden="true"><use href="#ic-plus" /></svg>
            <span>新建文章</span>
          </NuxtLink>

          <span class="divider-v" aria-hidden="true" />

          <div class="menu-wrap">
            <button type="button" class="account" :aria-expanded="openMenu === 'account'" @click="toggleMenu('account')">
              <span class="avatar">
                <img v-if="avatarUrl && !avatarBroken" :src="avatarUrl" :alt="displayName" @error="avatarBroken = true">
                <template v-else>{{ avatarLetter }}</template>
              </span>
              <span class="account-name">{{ displayName }}</span>
              <svg class="ic ic--sm" aria-hidden="true"><use href="#ic-chevron" /></svg>
            </button>
            <div v-if="openMenu === 'account'" class="menu" role="menu">
              <NuxtLink to="/" target="_blank" class="menu-item" role="menuitem" @click="closeMenus">
                <svg class="ic ic--sm" aria-hidden="true"><use href="#ic-external" /></svg>
                <span>查看博客</span>
              </NuxtLink>
              <div class="menu-sep" role="separator" />
              <button type="button" class="menu-item menu-item--danger" role="menuitem" @click="logout">
                <svg class="ic ic--sm" aria-hidden="true"><use href="#ic-logout" /></svg>
                <span>退出登录</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <main class="admin-content">
        <slot />
      </main>
    </div>

    <AdminConfirmDialog />
  </div>
</template>

<style scoped>
.admin {
  display: flex;
  min-height: 100vh;
  background: var(--admin-bg);
  color: var(--admin-body);
  font-family: var(--admin-font);
  -webkit-font-smoothing: antialiased;
}

.icon-sprite {
  position: absolute;
  width: 0;
  height: 0;
  overflow: hidden;
}

.ic {
  width: 17px;
  height: 17px;
  flex: 0 0 auto;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.8;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.ic--sm {
  width: 15px;
  height: 15px;
}

/* ------------------------------------------------------------- sidebar */

.admin-side {
  position: sticky;
  top: 0;
  display: flex;
  flex: 0 0 auto;
  flex-direction: column;
  align-self: flex-start;
  width: var(--admin-side-width);
  height: 100vh;
  border-right: 1px solid var(--admin-border);
  background: var(--admin-surface);
  transition: width var(--admin-duration) var(--admin-ease);
}

.admin-side.is-collapsed {
  width: var(--admin-side-collapsed);
}

.side-head {
  display: flex;
  align-items: center;
  gap: 9px;
  height: var(--admin-header-height);
  padding: 0 14px;
  border-bottom: 1px solid var(--admin-border);
}

.brand {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 9px;
  color: inherit;
  text-decoration: none;
}

.brand-mark {
  display: grid;
  flex: 0 0 auto;
  width: 30px;
  height: 30px;
  place-items: center;
  border-radius: 9px;
  background: var(--admin-accent);
  color: var(--admin-accent-contrast);
  font-size: 11.5px;
  font-weight: 700;
  letter-spacing: .01em;
}

.brand-text {
  display: flex;
  min-width: 0;
  flex-direction: column;
  line-height: 1.15;
}

.brand-text strong {
  overflow: hidden;
  color: var(--admin-text);
  font-size: 13.5px;
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.brand-text small {
  color: var(--admin-muted);
  font-size: 10.5px;
  letter-spacing: .02em;
}

.brand-dot {
  width: 6px;
  height: 6px;
  margin-left: auto;
  border-radius: 50%;
  background: var(--admin-accent);
  box-shadow: 0 0 0 4px var(--admin-accent-soft);
}

.side-nav {
  display: flex;
  flex: 1;
  flex-direction: column;
  gap: 2px;
  padding: 12px 8px;
  overflow-y: auto;
}

.nav-label {
  margin: 8px 8px 6px;
  color: var(--admin-faint);
  font-size: 10px;
  font-weight: 600;
  letter-spacing: .1em;
  text-transform: uppercase;
}

.nav-label--spaced {
  margin-top: 16px;
}

.nav-item {
  position: relative;
  display: flex;
  align-items: center;
  gap: 10px;
  height: 40px;
  padding: 0 11px;
  border-radius: var(--admin-radius);
  color: var(--admin-body);
  font-size: 13px;
  font-weight: 500;
  text-decoration: none;
  transition: background var(--admin-duration-fast) var(--admin-ease), color var(--admin-duration-fast) var(--admin-ease);
}

.nav-item:hover {
  background: var(--admin-hover);
  color: var(--admin-text);
}

.nav-item.is-active {
  background: var(--admin-active-bg);
  color: var(--admin-active-text);
  font-weight: 600;
}

.nav-item.is-active::before {
  position: absolute;
  top: 50%;
  left: -8px;
  width: 2px;
  height: 16px;
  border-radius: 0 2px 2px 0;
  background: var(--admin-accent);
  content: '';
  transform: translateY(-50%);
}

.nav-icon {
  width: 17px;
  height: 17px;
  opacity: .9;
}

.nav-text {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.is-collapsed .nav-item {
  justify-content: center;
  padding: 0;
}

.side-foot {
  padding: 8px;
  border-top: 1px solid var(--admin-border);
}

.nav-item--ghost {
  color: var(--admin-muted);
  font-size: 12px;
}

/* -------------------------------------------------------------- topbar */

.admin-main {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-width: 0;
}

.admin-topbar {
  position: sticky;
  top: 0;
  z-index: 20;
  display: flex;
  align-items: center;
  gap: 4px;
  height: var(--admin-header-height);
  padding: 0 12px;
  border-bottom: 1px solid var(--admin-border);
  background: var(--admin-topbar-bg);
  backdrop-filter: blur(10px);
}

.icon-btn {
  display: grid;
  width: 32px;
  height: 32px;
  padding: 0;
  place-items: center;
  border: 0;
  border-radius: var(--admin-radius);
  background: transparent;
  color: var(--admin-muted);
  cursor: pointer;
  transition: background var(--admin-duration-fast) var(--admin-ease), color var(--admin-duration-fast) var(--admin-ease);
}

.icon-btn:hover {
  background: var(--admin-hover);
  color: var(--admin-text);
}

.icon-btn:focus-visible {
  outline: 2px solid var(--admin-accent-ring);
  outline-offset: 1px;
}

.icon-btn--dot {
  position: relative;
}

.unread-dot {
  position: absolute;
  top: 7px;
  right: 8px;
  width: 5px;
  height: 5px;
  border-radius: 50%;
  background: var(--admin-danger);
  box-shadow: 0 0 0 2px var(--admin-surface);
}

.crumb {
  display: flex;
  align-items: center;
  gap: 7px;
  margin-left: 6px;
  color: var(--admin-muted);
  font-size: 12.5px;
  white-space: nowrap;
}

.crumb-link {
  color: var(--admin-muted);
  text-decoration: none;
  transition: color var(--admin-duration-fast) var(--admin-ease);
}

.crumb-link:hover {
  color: var(--admin-text);
}

.crumb-sep {
  color: var(--admin-faint);
}

.crumb-current {
  color: var(--admin-text);
  font-weight: 600;
}

.topbar-right {
  display: flex;
  align-items: center;
  gap: 4px;
  margin-left: auto;
}

.mode-switch {
  margin: 0 2px;
}

.mode-switch :deep(.color-mode-switcher) {
  border-color: var(--admin-border);
  background: var(--admin-bg);
}

.mode-switch :deep(button) {
  color: var(--admin-muted);
}

.mode-switch :deep(button[aria-pressed='true']) {
  background: var(--admin-surface);
  box-shadow: 0 0 0 1px var(--admin-border), var(--admin-shadow-sm);
}

.btn-primary {
  display: inline-flex;
  align-items: center;
  gap: 6px;
  height: 32px;
  margin-left: 4px;
  padding: 0 12px;
  border-radius: var(--admin-radius);
  background: var(--admin-accent);
  color: var(--admin-accent-contrast);
  font-size: 12.5px;
  font-weight: 600;
  text-decoration: none;
  transition: background var(--admin-duration-fast) var(--admin-ease);
}

.btn-primary:hover {
  background: var(--admin-accent-hover);
}

.btn-primary .ic {
  width: 15px;
  height: 15px;
}

.divider-v {
  width: 1px;
  height: 20px;
  margin: 0 4px;
  background: var(--admin-border);
}

.account {
  display: flex;
  align-items: center;
  gap: 7px;
  height: 34px;
  padding: 0 8px 0 4px;
  border: 0;
  border-radius: var(--admin-radius-pill);
  background: transparent;
  color: var(--admin-body);
  cursor: pointer;
  transition: background var(--admin-duration-fast) var(--admin-ease);
}

.account:hover {
  background: var(--admin-hover);
}

.avatar {
  display: grid;
  width: 26px;
  height: 26px;
  overflow: hidden;
  place-items: center;
  border-radius: 50%;
  background: var(--admin-avatar-bg);
  color: #fff;
  font-size: 11px;
  font-weight: 600;
}

.avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.account-name {
  max-width: 120px;
  overflow: hidden;
  color: var(--admin-text);
  font-size: 12.5px;
  font-weight: 500;
  text-overflow: ellipsis;
  white-space: nowrap;
}

/* --------------------------------------------------------------- menus */

.menu-wrap {
  position: relative;
  display: flex;
}

.menu {
  position: absolute;
  top: calc(100% + 8px);
  right: 0;
  z-index: 40;
  min-width: 176px;
  padding: 5px;
  border: 1px solid var(--admin-border);
  border-radius: 10px;
  background: var(--admin-surface);
  box-shadow: var(--admin-shadow-lg);
}

.menu--swatches {
  display: grid;
  width: 196px;
  grid-template-columns: 1fr 1fr;
  gap: 4px;
}

.swatch {
  display: flex;
  align-items: center;
  gap: 7px;
  height: 32px;
  padding: 0 8px;
  border: 1px solid transparent;
  border-radius: 7px;
  background: transparent;
  color: var(--admin-body);
  font-size: 12px;
  cursor: pointer;
  transition: background var(--admin-duration-fast) var(--admin-ease);
}

.swatch:hover {
  background: var(--admin-hover);
}

.swatch.is-active {
  border-color: var(--admin-border);
  background: var(--admin-active-bg);
  color: var(--admin-active-text);
  font-weight: 600;
}

.swatch-dot {
  width: 12px;
  height: 12px;
  flex: 0 0 auto;
  border-radius: 50%;
  box-shadow: inset 0 0 0 1px rgb(0 0 0 / 12%);
}

.swatch-label {
  flex: 1;
  text-align: left;
}

.swatch-check {
  width: 13px;
  height: 13px;
  color: var(--admin-accent);
}

.menu-item {
  display: flex;
  width: 100%;
  align-items: center;
  gap: 8px;
  height: 34px;
  padding: 0 9px;
  border: 0;
  border-radius: 7px;
  background: transparent;
  color: var(--admin-body);
  font-family: inherit;
  font-size: 12.5px;
  text-decoration: none;
  cursor: pointer;
  transition: background var(--admin-duration-fast) var(--admin-ease), color var(--admin-duration-fast) var(--admin-ease);
}

.menu-item:hover {
  background: var(--admin-hover);
  color: var(--admin-text);
}

.menu-item--danger {
  color: var(--admin-danger);
}

.menu-item--danger:hover {
  background: color-mix(in oklab, var(--admin-danger) 10%, transparent);
  color: var(--admin-danger);
}

.menu-sep {
  height: 1px;
  margin: 5px 4px;
  background: var(--admin-border);
}

/* -------------------------------------------------------------- content */

.admin-content {
  width: 100%;
  max-width: 1560px;
  flex: 1;
  margin: 0 auto;
  padding: 18px 16px 40px;
}

.admin-backdrop {
  position: fixed;
  z-index: 55;
  inset: 0;
  background: rgb(8 12 16 / 45%);
  backdrop-filter: blur(2px);
}

@media (max-width: 1100px) {
  .crumb-link {
    display: none;
  }

  .crumb-sep {
    display: none;
  }
}

@media (max-width: 920px) {
  .admin-side {
    position: fixed;
    z-index: 60;
    inset: 0 auto 0 0;
    width: var(--admin-side-width);
    transform: translateX(-100%);
    transition: transform var(--admin-duration) var(--admin-ease);
  }

  .admin-side.is-open {
    box-shadow: var(--admin-shadow-lg);
    transform: none;
  }

  .admin-content {
    padding: 14px 12px 32px;
  }

  .account-name {
    display: none;
  }
}

@media (max-width: 640px) {
  .mode-switch,
  .divider-v {
    display: none;
  }

  .btn-primary span {
    display: none;
  }

  .btn-primary {
    padding: 0 9px;
  }
}
</style>
