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
  { label: '图片上传', to: '/admin/media', icon: 'i-lucide-images' },
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

    <aside class="admin-side" :class="{ 'is-collapsed': collapsed, 'is-open': mobileOpen }">
      <div class="side-head">
        <NuxtLink to="/admin" class="brand" @click="mobileOpen = false">
          <span class="brand-mark">
            <img v-if="avatarUrl && !avatarBroken" :src="avatarUrl" :alt="displayName" @error="avatarBroken = true">
            <template v-else>CB</template>
          </span>
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
          <SvgoExternalLink class="ic" aria-hidden="true" />
          <span v-if="!collapsed" class="nav-text">查看博客</span>
        </NuxtLink>
      </div>
    </aside>

    <div v-if="mobileOpen" class="admin-backdrop" @click="mobileOpen = false" />

    <div class="admin-main">
      <header class="admin-topbar">
        <button type="button" class="icon-btn" :aria-label="collapsed ? '展开侧栏' : '收起侧栏'" @click="toggleSidebar">
          <SvgoPanelLeftOpen v-if="collapsed" class="ic" aria-hidden="true" /><SvgoPanelLeft v-else class="ic" aria-hidden="true" />
        </button>
        <button type="button" class="icon-btn" aria-label="刷新页面" @click="refresh">
          <SvgoRefresh class="ic" aria-hidden="true" />
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
            <SvgoMinimize v-if="isFullscreen" class="ic" aria-hidden="true" /><SvgoMaximize v-else class="ic" aria-hidden="true" />
          </button>

          <div class="menu-wrap">
            <button type="button" class="icon-btn icon-btn--dot" aria-label="通知" title="通知（即将上线）" @click="closeMenus">
              <SvgoBell class="ic" aria-hidden="true" />
              <span class="unread-dot" aria-hidden="true" />
            </button>
          </div>

          <div class="menu-wrap">
            <button type="button" class="icon-btn" aria-label="主题色" :aria-expanded="openMenu === 'accent'" @click="toggleMenu('accent')">
              <SvgoPalette class="ic" aria-hidden="true" />
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
                <SvgoCheck v-if="item.id === currentAccent.id" class="ic swatch-check" aria-hidden="true" />
              </button>
            </div>
          </div>

          <div class="mode-switch"><ColorModeSwitcher /></div>

          <NuxtLink v-if="showNewPost" to="/admin/posts/new" class="btn-primary">
            <SvgoPlus class="ic" aria-hidden="true" />
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
              <SvgoChevronDown class="ic ic--sm" aria-hidden="true" />
            </button>
            <div v-if="openMenu === 'account'" class="menu" role="menu">
              <NuxtLink to="/" target="_blank" class="menu-item" role="menuitem" @click="closeMenus">
                <SvgoExternalLink class="ic ic--sm" aria-hidden="true" />
                <span>查看博客</span>
              </NuxtLink>
              <div class="menu-sep" role="separator" />
              <button type="button" class="menu-item menu-item--danger" role="menuitem" @click="logout">
                <SvgoLogOut class="ic ic--sm" aria-hidden="true" />
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

.ic {
  width: 18px;
  height: 18px;
  flex: 0 0 auto;
  fill: none;
  stroke: currentColor;
  stroke-width: 1.8;
  stroke-linecap: round;
  stroke-linejoin: round;
}

.ic--sm {
  width: 16px;
  height: 16px;
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
  gap: 10px;
  height: var(--admin-header-height);
  padding: 0 14px;
  border-bottom: 1px solid var(--admin-border);
}

.brand {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 10px;
  color: inherit;
  text-decoration: none;
}

.brand-mark {
  position: relative;
  display: grid;
  overflow: hidden;
  flex: 0 0 auto;
  width: 30px;
  height: 30px;
  min-width: 30px;
  place-items: center;
  /* The public site slants its // Blog lockup with the same class name. */
  transform: none;
  border-radius: 10px;
  background: var(--admin-accent);
  box-shadow: 0 0 0 1px var(--admin-border);
  color: var(--admin-accent-contrast);
  font-size: 12px;
  font-weight: 700;
  letter-spacing: .01em;
}

.brand-mark img {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  object-fit: cover;
}

/* The avatar PNG is transparent around the character, so the accent fill behind it
   would show through as a blue plate. Keep the accent only for the CB fallback. */
.brand-mark:has(img) {
  background: transparent;
  box-shadow: none;
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
  font-size: 14px;
  font-weight: 600;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.brand-text small {
  color: var(--admin-muted);
  font-size: 10px;
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
  padding: 0 12px;
  border-radius: var(--admin-radius);
  color: var(--admin-body);
  font-size: 14px;
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
  width: 18px;
  height: 18px;
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
  top: 8px;
  right: 8px;
  width: 6px;
  height: 6px;
  border-radius: 50%;
  background: var(--admin-danger);
  box-shadow: 0 0 0 2px var(--admin-surface);
}

.crumb {
  display: flex;
  align-items: center;
  gap: 8px;
  margin-left: 6px;
  color: var(--admin-muted);
  font-size: 12px;
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
  font-size: 12px;
  font-weight: 600;
  text-decoration: none;
  transition: background var(--admin-duration-fast) var(--admin-ease);
}

.btn-primary:hover {
  background: var(--admin-accent-hover);
}

.btn-primary .ic {
  width: 16px;
  height: 16px;
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
  gap: 8px;
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
  font-size: 12px;
  font-weight: 600;
}

.avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

/* The uploaded avatar is a transparent PNG, so its plate would show through. */
.avatar:has(img) {
  background: transparent;
}

.account-name {
  max-width: 120px;
  overflow: hidden;
  color: var(--admin-text);
  font-size: 12px;
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
  padding: 6px;
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
  gap: 8px;
  height: 32px;
  padding: 0 8px;
  border: 1px solid transparent;
  border-radius: 8px;
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
  width: 14px;
  height: 14px;
  color: var(--admin-accent);
}

.menu-item {
  display: flex;
  width: 100%;
  align-items: center;
  gap: 8px;
  height: 34px;
  padding: 0 10px;
  border: 0;
  border-radius: 8px;
  background: transparent;
  color: var(--admin-body);
  font-family: inherit;
  font-size: 12px;
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
  margin: 6px 4px;
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
    padding: 0 10px;
  }
}
</style>
