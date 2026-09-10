<script setup lang="ts">
const props = defineProps<{
  label: string
  value: string | number
  icon: string
  caption: string
  tone?: 'primary' | 'success' | 'neutral'
  chart?: 'one' | 'two' | 'three'
}>()

const chartPath = computed(() => ({
  one: 'M2 50 C14 50 16 39 28 38 C40 37 42 48 52 48 C64 48 65 20 78 20 C90 20 92 47 105 47 C117 47 120 51 130 51 C141 51 143 30 154 30 C161 30 165 36 168 40',
  two: 'M2 42 C12 42 17 25 29 24 C41 23 45 34 55 34 C67 34 70 20 82 20 C94 20 95 38 109 38 C121 38 124 49 135 49 C146 49 148 32 158 31 C163 31 167 35 168 36',
  three: 'M2 46 C15 46 17 35 29 35 C40 35 43 47 55 47 C67 47 70 26 82 26 C94 26 96 43 108 43 C120 43 122 47 133 47 C144 47 148 23 158 23 C163 23 166 27 168 30',
})[props.chart || 'one'])
</script>

<template>
  <UCard class="stat-card" :ui="{ body: 'p-0 sm:p-0' }">
    <div class="stat-card-inner">
      <div class="stat-card-head">
        <span>{{ label }}</span>
        <UIcon :name="icon" aria-hidden="true" />
      </div>
      <div class="stat-card-bottom">
        <strong>{{ value }}</strong>
        <div class="sparkline" :data-tone="tone || 'neutral'" :title="caption" aria-hidden="true">
          <svg viewBox="0 0 170 62" preserveAspectRatio="none">
            <path class="spark-fill" :d="`${chartPath} L168 62 L2 62 Z`" />
            <path class="spark-line" :d="chartPath" />
          </svg>
        </div>
      </div>
    </div>
  </UCard>
</template>

<style scoped>
.stat-card{min-height:156px;border-color:var(--admin-border,var(--color-border));box-shadow:none}.stat-card-inner{display:flex;min-height:154px;flex-direction:column;justify-content:space-between;padding:27px 28px 25px}.stat-card-head{display:flex;align-items:center;justify-content:space-between;gap:16px;color:var(--color-text);font-size:14px;font-weight:600}.stat-card-head :deep(svg){width:19px;height:19px;color:var(--color-text-secondary);stroke-width:1.7}.stat-card-bottom{display:flex;align-items:flex-end;justify-content:space-between;gap:18px}.stat-card-bottom strong{font-size:40px;font-weight:650;letter-spacing:-.045em;line-height:1}.sparkline{width:142px;height:58px;color:var(--color-primary)}.sparkline[data-tone="success"]{color:#21ad63}.sparkline[data-tone="neutral"]{color:#7b8491}.sparkline svg{display:block;width:100%;height:100%;overflow:visible}.spark-line{fill:none;stroke:currentColor;stroke-linecap:round;stroke-width:2}.spark-fill{fill:currentColor;opacity:.07}@media(max-width:1240px){.sparkline{width:110px}}@media(max-width:760px){.stat-card-inner{padding:23px}.sparkline{width:145px}}
</style>
