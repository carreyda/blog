<script setup lang="ts">
const session = useState<{ csrfToken: string; user: { id: number; username: string; role: 'ADMIN' } } | null>('admin-session', () => null)
const loggingOut = ref(false)

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
    <aside class="admin-sidebar">
      <NuxtLink class="brand" to="/admin">Blog Admin</NuxtLink>
      <nav aria-label="后台导航">
        <NuxtLink to="/admin">仪表盘</NuxtLink>
        <NuxtLink to="/admin/posts">文章管理</NuxtLink>
        <NuxtLink to="/admin/tags">标签管理</NuxtLink>
        <NuxtLink to="/admin/projects">项目管理</NuxtLink>
        <NuxtLink to="/admin/settings">网站设置</NuxtLink>
      </nav>
      <div class="admin-sidebar-actions">
        <ColorModeSwitcher />
        <UButton color="neutral" variant="ghost" :loading="loggingOut" @click="logout">退出登录</UButton>
      </div>
    </aside>
    <main class="admin-main"><slot /></main>
  </div>
</template>

<style scoped>
.admin-shell { display: grid; min-height: 100vh; grid-template-columns: 220px 1fr; background: var(--color-background-secondary); }
.admin-sidebar { display: flex; flex-direction: column; gap: 28px; padding: 28px 20px; border-right: 1px solid var(--color-border); background: var(--color-background); }
.admin-sidebar nav { display: grid; flex: 1; gap: 6px; align-content: start; }
.admin-sidebar nav a { padding: 9px 10px; border-radius: var(--radius-sm); color: var(--color-text-secondary); font-size: 13px; }
.admin-sidebar nav a:hover, .admin-sidebar nav a.router-link-active { background: var(--color-background-secondary); color: var(--color-primary); }
.admin-sidebar-actions { display: flex; align-items: center; justify-content: space-between; gap: 10px; }
.admin-main { width: 100%; min-width: 0; padding: 36px clamp(28px, 3vw, 56px); }
@media (max-width: 720px) { .admin-shell { grid-template-columns: 1fr; } .admin-sidebar { border-right: 0; border-bottom: 1px solid var(--color-border); } .admin-sidebar nav { grid-template-columns: repeat(2, 1fr); } .admin-main { padding: 24px 18px; } }
</style>
