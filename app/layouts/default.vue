<script setup lang="ts">
const { data: settingsResponse } = await useFetch<any>('/api/settings')
const siteName = computed(() => settingsResponse.value?.data.siteName || 'Blog')
</script>

<template>
  <div class="site-shell">
    <header class="site-header">
      <NuxtLink class="brand" to="/" aria-label="返回首页">
        <span class="brand-mark" aria-hidden="true"><i /><i /></span>
        <span>{{ siteName }}</span>
      </NuxtLink>

      <nav class="site-nav" aria-label="主导航">
        <NuxtLink to="/">首页</NuxtLink>
        <NuxtLink to="/blog">文章</NuxtLink>
        <NuxtLink to="/projects">项目</NuxtLink>
        <NuxtLink to="/about">关于</NuxtLink>
      </nav>
    </header>

    <main class="site-main">
      <slot />
    </main>

    <footer class="site-footer">© {{ new Date().getFullYear() }} {{ siteName }}</footer>
  </div>
</template>
