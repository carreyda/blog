<script setup lang="ts">
definePageMeta({ layout: 'admin' })

const route = useRoute()
const { data: response, error } = await useFetch<any>(`/api/admin/posts/${route.params.id}`)
if (error.value) throw createError({ statusCode: error.value.statusCode || 404, statusMessage: '文章不存在' })
useSeoMeta({ title: () => `编辑 ${response.value?.data.title || '文章'}` })
</script>

<template>
  <section class="editor-page">
    <AdminPageHeader title="编辑文章" />
    <AdminPostForm v-if="response?.data" :post="response.data" />
  </section>
</template>

<style scoped>.editor-page{display:grid;gap:16px}</style>
