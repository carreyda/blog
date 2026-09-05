<script setup lang="ts">
defineProps<{
  eyebrow?: string
  title: string
  description?: string
}>()
</script>

<template>
  <header class="admin-page-header">
    <div>
      <p v-if="eyebrow" class="admin-eyebrow">{{ eyebrow }}</p>
      <h1>{{ title }}</h1>
      <p v-if="description" class="admin-description">{{ description }}</p>
    </div>
    <div v-if="$slots.actions" class="admin-page-actions">
      <slot name="actions" />
    </div>
  </header>
</template>

<style scoped>
.admin-page-header {
  display: flex;
  align-items: flex-start;
  justify-content: space-between;
  gap: 24px;
}

.admin-eyebrow {
  margin: 0 0 8px;
  color: var(--color-primary);
  font-size: 11px;
  font-weight: 700;
  letter-spacing: .12em;
  text-transform: uppercase;
}

h1 {
  margin: 0;
  font-size: clamp(24px, 2vw, 30px);
  font-weight: 680;
  letter-spacing: -.035em;
  line-height: 1.2;
}

.admin-description {
  max-width: 620px;
  margin: 9px 0 0;
  color: var(--color-text-secondary);
  font-size: 13px;
  line-height: 1.65;
}

.admin-page-actions {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  justify-content: flex-end;
  gap: 10px;
}

@media (max-width: 640px) {
  .admin-page-header { flex-direction: column; }
  .admin-page-actions { width: 100%; justify-content: flex-start; }
}
</style>
