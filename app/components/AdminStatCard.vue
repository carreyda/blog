<script setup lang="ts">
defineProps<{
  label: string
  value: string | number
  icon: string
  caption: string
  tone?: 'primary' | 'success' | 'neutral'
}>()
</script>

<template>
  <UCard class="stat-card">
    <div class="stat-card-head">
      <span>{{ label }}</span>
      <span class="stat-icon" :data-tone="tone || 'neutral'">
        <UIcon :name="icon" aria-hidden="true" />
      </span>
    </div>
    <strong>{{ value }}</strong>
    <p>{{ caption }}</p>
  </UCard>
</template>

<style scoped>
.stat-card { min-height: 156px; }
.stat-card-head { display: flex; align-items: center; justify-content: space-between; gap: 16px; color: var(--color-text-secondary); font-size: 13px; font-weight: 600; }
.stat-icon { display: grid; width: 32px; height: 32px; place-items: center; border-radius: 9px; background: var(--color-background-secondary); color: var(--color-text-secondary); }
.stat-icon[data-tone="primary"] { background: color-mix(in srgb, var(--color-primary) 11%, transparent); color: var(--color-primary); }
.stat-icon[data-tone="success"] { background: rgb(34 197 94 / 11%); color: #16a34a; }
.stat-icon :deep(svg) { width: 16px; height: 16px; }
strong { display: block; margin-top: 20px; font-size: 30px; font-weight: 680; letter-spacing: -.04em; line-height: 1; }
p { margin: 10px 0 0; color: var(--color-text-muted); font-size: 11.5px; }
</style>
