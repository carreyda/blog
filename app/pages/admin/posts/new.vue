<script setup lang="ts">
definePageMeta({ layout: 'admin' })
useSeoMeta({ title: '新建文章' })
</script>

<template>
  <section class="editor-page">
    <AdminPostForm />
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
