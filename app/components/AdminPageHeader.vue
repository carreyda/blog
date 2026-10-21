<script setup lang="ts">
defineProps<{
  eyebrow?: string
  title: string
  description?: string
}>()
</script>

<template>
  <UPageHeader
    :headline="eyebrow"
    :title="title"
    :description="description"
    :ui="{
      root: 'admin-page-header',
      headline: 'admin-eyebrow',
      title: 'admin-page-heading',
      description: 'admin-description',
      links: 'admin-page-actions',
    }"
  >
    <template #links>
      <slot name="actions" />
    </template>
  </UPageHeader>
</template>

<style scoped>
.admin-page-header {
  padding: 0;
  border: 0;
}

.admin-page-header :deep(.admin-eyebrow) {
  margin: 0 0 8px;
  color: var(--color-primary);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: .12em;
  text-transform: uppercase;
}

.admin-page-header :deep(.admin-page-heading) {
  margin: 0;
  font-size: clamp(24px, 2vw, 30px);
  font-weight: 680;
  letter-spacing: -.035em;
  line-height: 1.2;
}

.admin-page-header :deep(.admin-description) {
  max-width: 620px;
  margin: 9px 0 0;
  color: var(--color-text-secondary);
  font-size: 13px;
  line-height: 1.65;
}

.admin-page-header :deep(.admin-page-actions) {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
}

@media (max-width: 640px) {
  .admin-page-header :deep(.admin-page-actions) {
    width: 100%;
    justify-content: flex-start;
  }
}
</style>
