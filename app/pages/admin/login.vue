<script setup lang="ts">
definePageMeta({ layout: 'admin-auth' })

const form = reactive({ username: '', password: '' })
const pending = ref(false)
const errorMessage = ref('')
const showPassword = ref(false)
const session = useState<{ csrfToken: string; user: { id: number; username: string; role: 'ADMIN' } } | null>('admin-session', () => null)

if (session.value) await navigateTo('/admin')

async function submit() {
  if (pending.value) return
  pending.value = true
  errorMessage.value = ''
  try {
    const response = await $fetch('/api/auth/login', { method: 'POST', body: form })
    if (!('data' in response)) throw new Error(response.error.message)
    session.value = response.data
    await navigateTo('/admin')
  } catch (error: any) {
    errorMessage.value = error?.data?.error?.message || '登录失败，请检查账号与密码'
  } finally { pending.value = false }
}
</script>

<template>
  <div class="login-panel">
    <div class="login-heading">
      <span class="login-icon"><UIcon name="i-lucide-command" /></span>
      <p>欢迎回来</p>
      <h2>登录管理后台</h2>
      <span>使用管理员账号进入内容工作台。</span>
    </div>
    <UCard class="auth-card">
      <form class="auth-form" @submit.prevent="submit">
        <UFormField label="用户名" required><UInput v-model="form.username" autocomplete="username" size="xl" icon="i-lucide-user-round" class="w-full" placeholder="输入用户名" autofocus /></UFormField>
        <UFormField label="密码" required>
          <UInput v-model="form.password" :type="showPassword ? 'text' : 'password'" autocomplete="current-password" size="xl" icon="i-lucide-lock-keyhole" class="w-full" placeholder="输入密码">
            <template #trailing><UButton type="button" color="neutral" variant="ghost" size="xs" :icon="showPassword ? 'i-lucide-eye-off' : 'i-lucide-eye'" :aria-label="showPassword ? '隐藏密码' : '显示密码'" @click="showPassword = !showPassword" /></template>
          </UInput>
        </UFormField>
        <UAlert v-if="errorMessage" color="error" variant="soft" icon="i-lucide-circle-alert" :description="errorMessage" />
        <UButton type="submit" block size="xl" icon="i-lucide-log-in" :loading="pending">进入工作台</UButton>
      </form>
    </UCard>
    <NuxtLink to="/" class="back-link"><UIcon name="i-lucide-arrow-left" />返回博客首页</NuxtLink>
  </div>
</template>

<style scoped>
.login-panel{display:grid;width:min(100%,430px);gap:24px}.login-heading{text-align:center}.login-icon{display:grid;width:42px;height:42px;margin:0 auto 22px;place-items:center;border:1px solid rgba(68,147,248,.22);border-radius:13px;color:#2878d4;background:rgba(68,147,248,.1);font-size:18px}.login-heading p{margin:0 0 7px;color:#2878d4;font-size:11px;font-weight:700;letter-spacing:.12em}.login-heading h2{margin:0;font-size:27px;letter-spacing:-.035em}.login-heading>span:last-child{display:block;margin-top:9px;color:var(--color-text-secondary);font-size:13px}.auth-card{box-shadow:0 18px 50px rgba(15,23,42,.08)}.auth-form{display:grid;gap:20px;padding:6px}.back-link{display:flex;align-items:center;justify-content:center;gap:7px;color:var(--color-text-secondary);font-size:12px;text-decoration:none;transition:color .15s ease}.back-link:hover{color:var(--color-primary)}
</style>
