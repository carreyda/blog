<script setup lang="ts">
definePageMeta({ layout: 'admin' })

const route = useRoute()
const { data: response, error } = await useFetch<any>(`/api/admin/posts/${route.params.id}`)
if (error.value) throw createError({ statusCode: error.value.statusCode || 404, statusMessage: '文章不存在' })
useSeoMeta({ title: () => `编辑 ${response.value?.data.title || '文章'}` })
</script>
<template><section class="editor-page"><header><p class="eyebrow">EDIT POST</p><h1>编辑文章</h1></header><AdminPostForm v-if="response?.data" :post="response.data" /></section></template>
<style scoped>.editor-page{display:grid;gap:24px}.editor-page h1{margin:0}</style>
