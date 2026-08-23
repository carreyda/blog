<script setup lang="ts">
definePageMeta({ layout: 'admin' })
useSeoMeta({ title: '新建文章' })
</script>
<template><section class="editor-page"><header><p class="eyebrow">NEW POST</p><h1>新建文章</h1></header><AdminPostForm /></section></template>
<style scoped>.editor-page{display:grid;gap:24px}.editor-page h1{margin:0}</style>
