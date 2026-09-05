<script setup lang="ts">
definePageMeta({ layout: 'admin' })
useSeoMeta({ title: '新建文章' })
</script>

<template>
  <section class="editor-page">
    <AdminPageHeader eyebrow="内容创作" title="新建文章" description="编写内容、设置标签，并在准备好后直接发布。">
      <template #actions><UButton to="/admin/posts" color="neutral" variant="outline" icon="i-lucide-arrow-left">返回列表</UButton></template>
    </AdminPageHeader>
    <AdminPostForm />
  </section>
</template>

<style scoped>.editor-page{display:grid;gap:24px}</style>
