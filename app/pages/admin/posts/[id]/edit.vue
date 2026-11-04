<script setup lang="ts">
definePageMeta({ layout: 'admin' })

const route = useRoute()
const { data: response, error } = await useFetch<any>(`/api/admin/posts/${route.params.id}`)
if (error.value) throw createError({ statusCode: error.value.statusCode || 404, statusMessage: '文章不存在' })
useSeoMeta({ title: () => `编辑 ${response.value?.data.title || '文章'}` })
</script>

<template>
  <section class="editor-page">
    <AdminPostForm v-if="response?.data" :post="response.data" />
  </section>
</template>

<style scoped>
/* Fill the viewport so only the editor body scrolls, not the page. */
.editor-page {
  display: grid;
  gap: 16px;
  height: calc(100vh - var(--admin-header-height) - 58px);
  height: calc(100dvh - var(--admin-header-height) - 58px);
}

@media (max-width: 900px) {
  .editor-page { height: auto; }
}
</style>
