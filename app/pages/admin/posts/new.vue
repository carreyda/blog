<script setup lang="ts">
definePageMeta({ layout: 'admin' })
useSeoMeta({ title: '新建文章' })
</script>

<template>
  <section class="editor-page">
    <AdminPageHeader title="新建文章" />
    <AdminPostForm />
  </section>
</template>

<style scoped>.editor-page{display:grid;gap:16px}</style>
