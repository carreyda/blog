<script setup lang="ts">
definePageMeta({ layout: 'admin-auth' })

const form = reactive({ username: '', password: '' })
const pending = ref(false)
const errorMessage = ref('')
const session = useState<{ csrfToken: string; user: { id: number; username: string; role: 'ADMIN' } } | null>('admin-session', () => null)

if (session.value) await navigateTo('/admin')

async function submit() {
  pending.value = true
  errorMessage.value = ''
  try {
    const response = await $fetch('/api/auth/login', { method: 'POST', body: form })
    if (!('data' in response)) throw new Error(response.error.message)
    session.value = response.data
    await navigateTo('/admin')
  } catch (error: any) {
    errorMessage.value = error?.data?.error?.message || '登录失败，请稍后重试'
  } finally {
    pending.value = false
  }
}
</script>

<template>
  <UCard class="auth-card">
    <template #header>
      <div>
        <h1>管理员登录</h1>
        <p>登录后管理文章、项目和网站设置。</p>
      </div>
    </template>

    <form class="auth-form" @submit.prevent="submit">
      <UFormField label="用户名" required>
        <UInput v-model="form.username" autocomplete="username" class="w-full" />
      </UFormField>
      <UFormField label="密码" required>
        <UInput v-model="form.password" type="password" autocomplete="current-password" class="w-full" />
      </UFormField>
      <UAlert v-if="errorMessage" color="error" variant="soft" :description="errorMessage" />
      <UButton type="submit" block :loading="pending">登录</UButton>
    </form>
  </UCard>
</template>

<style scoped>
.auth-card { width: min(100%, 400px); }
.auth-card h1 { margin-bottom: 6px; font-size: 22px; }
.auth-card p { margin: 0; color: var(--color-text-secondary); font-size: 13px; }
.auth-form { display: grid; gap: 18px; }
</style>
