<script setup lang="ts">
const session = useState<{ csrfToken: string; user: { id: number; username: string; role: 'ADMIN' } } | null>('admin-session', () => null)
const loggingOut = ref(false)
const mobileNavOpen = ref(false)
const accountMenuOpen = ref(false)
const route = useRoute()
const router = useRouter()
const navigation = [
  { label: '', items: [{ label: '仪表盘', to: '/admin', icon: 'i-lucide-house' }] },
  {
    label: '内容管理',
    items: [
      { label: '文章管理', to: '/admin/posts', icon: 'i-lucide-notebook-text' },
      { label: '标签管理', to: '/admin/tags', icon: 'i-lucide-tag' },
      { label: '项目管理', to: '/admin/projects', icon: 'i-lucide-panels-top-left' },
    ],
  },
  { label: '', divider: true, items: [{ label: '网站设置', to: '/admin/settings', icon: 'i-lucide-settings' }] },
]
const flatNavigation = navigation.flatMap(group => group.items)
const currentPage = computed(() => {
  if (route.path === '/admin/posts/new') return '新建文章'
  if (/^\/admin\/posts\/[^/]+\/edit\/?$/.test(route.path)) return '编辑文章'
  const match = [...flatNavigation].sort((a, b) => b.to.length - a.to.length)
    .find(item => route.path === item.to || (item.to !== '/admin' && route.path.startsWith(`${item.to}/`)))
  return match?.label || '管理后台'
})

watch(() => route.fullPath, () => {
  mobileNavOpen.value = false
  accountMenuOpen.value = false
})

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
  if (!session.value) return
  loggingOut.value = true
  try {
    await $fetch('/api/auth/logout', { method: 'POST', headers: { 'X-CSRF-Token': session.value.csrfToken } })
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
          <strong>Blog Admin</strong>
        </NuxtLink>
        <UButton class="admin-sidebar-close" icon="i-lucide-x" color="neutral" variant="ghost" square aria-label="关闭导航" @click="mobileNavOpen = false" />
      </div>

      <nav aria-label="后台导航">
        <section
          v-for="group in navigation"
          :key="group.label || group.items[0]?.to"
          class="admin-nav-group"
          :class="{ 'has-divider': group.divider }"
        >
          <p v-if="group.label">{{ group.label }}</p>
          <NuxtLink
            v-for="item in group.items"
            :key="item.to"
            :to="item.to"
            :class="{ active: route.path === item.to || (item.to !== '/admin' && route.path.startsWith(`${item.to}/`)) }"
          >
            <UIcon class="admin-nav-icon" :name="item.icon" aria-hidden="true" />
            <span>{{ item.label }}</span>
          </NuxtLink>
        </section>
      </nav>

      <div class="admin-sidebar-footer">
        <div class="admin-account-wrap">
          <button class="admin-user" type="button" :aria-expanded="accountMenuOpen" @click="accountMenuOpen = !accountMenuOpen">
            <span class="admin-avatar">{{ session?.user.username?.slice(0, 1).toUpperCase() || 'C' }}</span>
            <span>
              <strong>{{ session?.user.username || 'Carreyda' }}</strong>
              <small>管理员</small>
            </span>
            <UIcon name="i-lucide-chevron-down" :class="{ rotated: accountMenuOpen }" />
          </button>
          <Transition name="admin-pop">
            <div v-if="accountMenuOpen" class="admin-account-menu">
              <NuxtLink to="/" target="_blank"><UIcon name="i-lucide-external-link" />查看博客</NuxtLink>
              <button type="button" :disabled="loggingOut" @click="logout"><UIcon name="i-lucide-log-out" />{{ loggingOut ? '退出中…' : '退出登录' }}</button>
            </div>
          </Transition>
        </div>
        <ColorModeSwitcher variant="admin" />
      </div>
    </aside>

    <div class="admin-workspace">
      <header class="admin-topbar">
        <div class="admin-topbar-left">
          <UButton class="admin-menu-button" icon="i-lucide-menu" color="neutral" variant="ghost" square aria-label="打开导航" @click="mobileNavOpen = true" />
          <button class="admin-back" type="button" aria-label="返回上一页" @click="router.back()"><UIcon name="i-lucide-arrow-left" /></button>
          <UIcon class="admin-crumb-arrow" name="i-lucide-chevron-right" />
          <strong>{{ currentPage }}</strong>
        </div>
        <UButton to="/admin/posts/new" icon="i-lucide-pen-line" size="lg">新建文章</UButton>
      </header>
      <main class="admin-main">
        <div class="admin-content"><slot /></div>
      </main>
    </div>
  </div>
</template>

<style scoped>
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
  display: grid;
  min-height: 100vh;
  grid-template-columns: 288px minmax(0, 1fr);
  color: var(--admin-text);
  background: var(--admin-bg);
  font-family: system-ui, "PingFang SC", "Microsoft YaHei", sans-serif;
}

.admin-sidebar {
  position: sticky;
  top: 0;
  z-index: 30;
  display: flex;
  height: 100vh;
  flex-direction: column;
  padding: 27px 21px 22px;
  border-right: 1px solid var(--admin-border);
  background: var(--admin-surface);
}

.admin-sidebar-head {
  display: flex;
  height: 38px;
  align-items: center;
  justify-content: space-between;
  padding: 0 9px;
}

.admin-brand {
  display: flex;
  align-items: center;
  gap: 9px;
  color: var(--admin-text);
}

.admin-brand-mark {
  font-family: ui-monospace, monospace;
  font-size: 17px;
  font-weight: 900;
  letter-spacing: -.16em;
}

.admin-brand strong {
  font-size: 16px;
  font-weight: 680;
  letter-spacing: -.02em;
}

.admin-sidebar-close,
.admin-menu-button { display: none; }

.admin-sidebar nav {
  display: grid;
  flex: 1;
  align-content: start;
  margin-top: 28px;
  overflow-y: auto;
}

.admin-nav-group { display: grid; gap: 4px; }
.admin-nav-group + .admin-nav-group { margin-top: 22px; }
.admin-nav-group.has-divider {
  margin-top: 30px;
  padding-top: 25px;
  border-top: 1px solid var(--admin-border);
}

.admin-nav-group p {
  margin: 0 10px 10px;
  color: var(--admin-muted);
  font-size: 13px;
  font-weight: 450;
}

.admin-nav-group a {
  display: flex;
  min-height: 56px;
  align-items: center;
  gap: 14px;
  padding: 0 14px;
  border-radius: 8px;
  color: var(--admin-body);
  font-size: 14px;
  font-weight: 480;
  transition: color .15s ease, background .15s ease;
}

.admin-nav-icon {
  width: 20px;
  height: 20px;
  flex: 0 0 auto;
  font-size: 20px;
}

.admin-nav-group a:hover { color: var(--admin-text); background: var(--admin-hover); }
.admin-nav-group a.active {
  color: var(--admin-active-text);
  background: var(--admin-active-bg);
  font-weight: 570;
}

.admin-sidebar-footer {
  display: grid;
  gap: 22px;
  padding: 24px 0 34px;
  border-top: 1px solid var(--admin-border);
}

.admin-account-wrap {
  position: relative;
  padding-bottom: 20px;
  border-bottom: 1px solid var(--admin-border);
}

.admin-user {
  display: grid;
  width: 100%;
  grid-template-columns: 44px minmax(0, 1fr) 20px;
  align-items: center;
  gap: 12px;
  padding: 0;
  border: 0;
  color: var(--admin-text);
  background: transparent;
  text-align: left;
  cursor: pointer;
}

.admin-avatar {
  display: grid;
  width: 44px;
  height: 44px;
  place-items: center;
  border-radius: 50%;
  color: var(--admin-avatar-text);
  background: var(--admin-avatar-bg);
  font-size: 14px;
  font-weight: 700;
}

.admin-user > span:nth-child(2) { display: grid; min-width: 0; gap: 3px; }
.admin-user strong {
  overflow: hidden;
  font-size: 13px;
  font-weight: 650;
  text-overflow: ellipsis;
  white-space: nowrap;
}
.admin-user small { color: var(--admin-muted); font-size: 12px; }
.admin-user > svg {
  width: 17px;
  color: var(--admin-body);
  transition: transform .16s ease;
}
.admin-user > svg.rotated { transform: rotate(180deg); }

.admin-account-menu {
  position: absolute;
  right: 0;
  bottom: 54px;
  left: 0;
  display: grid;
  padding: 6px;
  border: 1px solid var(--admin-border);
  border-radius: 9px;
  background: var(--admin-surface);
  box-shadow: 0 12px 35px var(--admin-menu-shadow);
}

.admin-account-menu a,
.admin-account-menu button {
  display: flex;
  min-height: 36px;
  align-items: center;
  gap: 9px;
  padding: 0 10px;
  border: 0;
  border-radius: 6px;
  color: var(--admin-body);
  background: transparent;
  font: inherit;
  font-size: 12px;
  text-align: left;
  cursor: pointer;
}
.admin-account-menu a:hover,
.admin-account-menu button:hover { color: var(--admin-text); background: var(--admin-hover); }
.admin-account-menu svg { width: 15px; }

.admin-workspace { min-width: 0; }
.admin-topbar {
  position: sticky;
  top: 0;
  z-index: 20;
  display: flex;
  height: 78px;
  align-items: center;
  justify-content: space-between;
  gap: 16px;
  padding: 0 34px;
  border-bottom: 1px solid var(--admin-border);
  background: var(--admin-topbar-bg);
  backdrop-filter: blur(14px);
}

.admin-topbar-left {
  display: flex;
  align-items: center;
  gap: 12px;
  color: var(--admin-muted);
  font-size: 13px;
}
.admin-topbar-left > strong { color: var(--admin-muted); font-weight: 480; }
.admin-back {
  display: grid;
  width: 30px;
  height: 30px;
  padding: 0;
  place-items: center;
  border: 0;
  border-radius: 6px;
  color: var(--admin-body);
  background: transparent;
  cursor: pointer;
}
.admin-back:hover { color: var(--admin-text); background: var(--admin-hover); }
.admin-back svg { width: 18px; }
.admin-crumb-arrow { width: 15px; color: var(--admin-faint); }
.admin-main { width: 100%; min-width: 0; padding: 38px 34px 58px; }
.admin-content { width: min(100%, 1400px); margin-inline: auto; }
.admin-overlay {
  position: fixed;
  z-index: 25;
  inset: 0;
  border: 0;
  background: rgba(0, 0, 0, .42);
}

.admin-fade-enter-active,
.admin-fade-leave-active,
.admin-pop-enter-active,
.admin-pop-leave-active { transition: opacity .16s ease, transform .16s ease; }
.admin-fade-enter-from,
.admin-fade-leave-to,
.admin-pop-enter-from,
.admin-pop-leave-to { opacity: 0; }
.admin-pop-enter-from,
.admin-pop-leave-to { transform: translateY(5px); }

@media (max-width: 900px) {
  .admin-shell { grid-template-columns: 1fr; }
  .admin-sidebar {
    position: fixed;
    left: 0;
    width: min(86vw, 288px);
    transform: translateX(-102%);
    box-shadow: 18px 0 50px rgba(0, 0, 0, .14);
    transition: transform .2s ease;
  }
  .admin-sidebar.is-open { transform: translateX(0); }
  .admin-sidebar-close,
  .admin-menu-button { display: inline-flex; }
  .admin-back,
  .admin-crumb-arrow { display: none; }
  .admin-topbar { height: 66px; padding-inline: 18px; }
  .admin-main { padding: 28px 18px 48px; }
}

@media (max-width: 520px) {
  .admin-topbar-left > strong { font-size: 12px; }
  .admin-topbar :deep(.ui-button) { font-size: 12px; }
}
</style>

<style>
html.dark .admin-shell {
  --admin-border: #2c3037;
  --admin-bg: #111318;
  --admin-surface: #15171b;
  --admin-topbar-bg: rgba(21, 23, 27, .92);
  --admin-text: #f3f4f6;
  --admin-body: #b8bec7;
  --admin-muted: #8e96a1;
  --admin-faint: #505761;
  --admin-hover: #202329;
  --admin-active-text: #72aafc;
  --admin-active-bg: rgba(68, 147, 248, .13);
  --admin-avatar-bg: #eceff3;
  --admin-avatar-text: #17191d;
  --admin-menu-shadow: rgba(0, 0, 0, .34);
}
</style>
