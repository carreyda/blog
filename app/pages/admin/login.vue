<script setup lang="ts">
definePageMeta({ layout: 'admin-auth' })

const form = reactive({ username: '', password: '' })
const pending = ref(false)
const { notifySuccess, notifyError } = useAdminFeedback()
const showPassword = ref(false)
const session = useState<{ csrfToken: string; user: { id: number; username: string; role: 'ADMIN' } } | null>('admin-session', () => null)

if (session.value) await navigateTo('/admin')

async function submit() {
  if (pending.value) return
  pending.value = true
  try {
    const response = await $fetch('/api/auth/login', { method: 'POST', body: form })
    if (!('data' in response)) throw new Error(response.error.message)
    session.value = response.data
    await navigateTo('/admin')
    notifySuccess('登录成功')
  } catch (error) {
    notifyError(error, '登录失败，请检查账号与密码')
  } finally { pending.value = false }
}
</script>

<template>
  <div class="login-panel">
    <header class="login-head">
      <p class="login-kicker">ADMIN CONSOLE</p>
      <h1>欢迎回来</h1>
      <p class="login-sub">使用管理员账号进入内容工作台。</p>
    </header>

    <form class="login-card" @submit.prevent="submit">
      <UFormField label="管理员账号" required>
        <UInput
          v-model="form.username"
          autocomplete="username"
          size="lg"
          icon="i-lucide-user-round"
          class="w-full"
          placeholder="输入用户名"
          autofocus
        />
      </UFormField>

      <UFormField label="登录密码" required>
        <UInput
          v-model="form.password"
          :type="showPassword ? 'text' : 'password'"
          autocomplete="current-password"
          size="lg"
          icon="i-lucide-lock-keyhole"
          class="w-full"
          placeholder="输入密码"
        >
          <template #trailing>
            <UButton
              type="button"
              color="neutral"
              variant="ghost"
              size="xs"
              :icon="showPassword ? 'i-lucide-eye-off' : 'i-lucide-eye'"
              :aria-label="showPassword ? '隐藏密码' : '显示密码'"
              @click="showPassword = !showPassword"
            />
          </template>
        </UInput>
      </UFormField>

      <UButton type="submit" block size="lg" class="login-submit" :loading="pending">
        进入工作台
      </UButton>
    </form>

    <NuxtLink to="/" class="back-link">返回博客首页</NuxtLink>
  </div>
</template>

<style scoped>
.login-panel {
  display: flex;
  flex-direction: column;
  gap: 20px;
}

.login-kicker {
  margin: 0;
  color: var(--admin-accent-text);
  font-size: 10.5px;
  font-weight: 700;
  letter-spacing: .16em;
}

.login-head h1 {
  margin: 10px 0 0;
  color: var(--admin-text);
  font-size: 28px;
  font-weight: 680;
  letter-spacing: -.035em;
  line-height: 1.2;
}

.login-sub {
  margin: 9px 0 0;
  color: var(--admin-muted);
  font-size: 13px;
}

.login-card {
  display: grid;
  gap: 16px;
  padding: 24px 24px 22px;
  border: 1px solid var(--admin-border);
  border-radius: 14px;
  background: var(--admin-surface);
  box-shadow: var(--admin-shadow);
}

.login-card :deep(label) {
  color: var(--admin-body);
  font-size: 12.5px;
  font-weight: 600;
}

.login-card :deep(button[type='button']) {
  color: var(--admin-muted);
}

.login-submit {
  height: 42px;
  margin-top: 2px;
  border-radius: var(--admin-radius);
  font-size: 13.5px;
  font-weight: 600;
}

.back-link {
  align-self: center;
  color: var(--admin-muted);
  font-size: 12px;
  text-decoration: none;
  transition: color var(--admin-duration-fast) var(--admin-ease);
}

.back-link:hover {
  color: var(--admin-accent-text);
}
</style>
