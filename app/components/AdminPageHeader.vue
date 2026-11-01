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
  margin: 0 0 5px;
  color: var(--admin-accent-text, var(--color-primary));
  font-size: 10.5px;
  font-weight: 680;
  letter-spacing: .11em;
  text-transform: uppercase;
}

.admin-page-header :deep(.admin-page-heading) {
  margin: 0;
  color: var(--admin-text, var(--color-text));
  font-size: 20px;
  font-weight: 680;
  letter-spacing: -.02em;
  line-height: 1.25;
}

.admin-page-header :deep(.admin-description) {
  max-width: 640px;
  margin: 5px 0 0;
  color: var(--admin-muted, var(--color-text-secondary));
  font-size: 12.5px;
  line-height: 1.6;
}

.admin-page-header :deep(.admin-page-actions) {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-end;
  gap: 8px;
}

@media (max-width: 640px) {
  .admin-page-header :deep(.admin-page-actions) {
    width: 100%;
    justify-content: flex-start;
  }
}
</style>
