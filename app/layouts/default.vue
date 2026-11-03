<script setup lang="ts">
const { data: settingsResponse } = await useFetch<any>('/api/settings')
const siteName = computed(() => settingsResponse.value?.data.siteName || 'Blog')
const logoUrl = computed(() => settingsResponse.value?.data.logoUrl || '')
const logoLoadFailed = ref(false)
watch(logoUrl, () => { logoLoadFailed.value = false })
const route = useRoute()
const isArticlePage = computed(() => /^\/blog\/[^/]+\/?$/.test(route.path))

const showToTop = ref(false)
const onScroll = () => {
  showToTop.value = window.scrollY > 360
}
onMounted(() => {
  onScroll()
  window.addEventListener('scroll', onScroll, { passive: true })
})
onBeforeUnmount(() => window.removeEventListener('scroll', onScroll))

const scrollToTop = () => {
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' })
}
</script>

<template>
  <div class="site-shell">
    <header class="site-header">
      <NuxtLink class="brand" to="/" aria-label="返回首页">
        <span class="brand-mark" :class="{ 'brand-mark--image': logoUrl && !logoLoadFailed }" aria-hidden="true">
          <img v-if="logoUrl && !logoLoadFailed" :src="logoUrl" alt="" @error="logoLoadFailed = true">
          <template v-else><i /><i /></template>
        </span>
        <span>{{ siteName }}</span>
      </NuxtLink>

      <div class="site-header-actions">
        <nav class="site-nav" aria-label="主导航">
          <NuxtLink to="/">首页</NuxtLink>
          <NuxtLink to="/blog">文章</NuxtLink>
          <NuxtLink to="/projects">项目</NuxtLink>
          <NuxtLink to="/bookmarks">收藏</NuxtLink>
          <NuxtLink to="/about">关于</NuxtLink>
        </nav>
        <ColorModeSwitcher />
      </div>
    </header>

    <main class="site-main" :class="{ 'site-main--article': isArticlePage }">
      <slot />
    </main>

    <footer class="site-footer">© {{ new Date().getFullYear() }} {{ siteName }}</footer>

    <button
      class="to-top"
      :class="{ 'is-visible': showToTop }"
      type="button"
      aria-label="回到顶部"
      :aria-hidden="!showToTop"
      :tabindex="showToTop ? 0 : -1"
      @click="scrollToTop"
    >
      <UIcon name="i-lucide-arrow-up" class="to-top-icon" />
    </button>
  </div>
</template>

<style scoped>
.to-top {
  position: fixed;
  right: 28px;
  bottom: 28px;
  z-index: 20;
  display: grid;
  place-items: center;
  width: 38px;
  height: 38px;
  padding: 0;
  border: 1px solid var(--color-border);
  border-radius: 50%;
  background: var(--color-background);
  color: var(--color-text-secondary);
  cursor: pointer;
  opacity: 0;
  visibility: hidden;
  transform: translateY(6px);
  transition: opacity .18s ease, transform .18s ease, visibility .18s, border-color .18s ease, color .18s ease;
}

.to-top.is-visible {
  opacity: 1;
  visibility: visible;
  transform: none;
}

.to-top:hover {
  border-color: var(--color-primary);
  color: var(--color-primary);
}

.to-top:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}

.to-top-icon {
  width: 16px;
  height: 16px;
}

@media (max-width: 700px) {
  .to-top {
    right: 16px;
    bottom: 16px;
    width: 36px;
    height: 36px;
  }
}

@media (prefers-reduced-motion: reduce) {
  .to-top {
    transition: none;
  }
}
</style>
