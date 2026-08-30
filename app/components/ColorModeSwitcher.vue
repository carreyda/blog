<script setup lang="ts">
type ColorModePreference = 'system' | 'light' | 'dark'

const colorMode = useColorMode()
const options: { value: ColorModePreference; label: string }[] = [
  { value: 'system', label: '跟随系统' },
  { value: 'light', label: '亮色模式' },
  { value: 'dark', label: '暗黑模式' },
]

function selectMode(mode: ColorModePreference) {
  colorMode.preference = mode
}
</script>

<template>
  <ClientOnly>
    <div class="color-mode-switcher" role="group" aria-label="显示模式">
      <button
        v-for="option in options"
        :key="option.value"
        type="button"
        :title="option.label"
        :aria-label="option.label"
        :aria-pressed="colorMode.preference === option.value"
        @click="selectMode(option.value)"
      >
        <svg v-if="option.value === 'system'" aria-hidden="true" viewBox="0 0 24 24">
          <rect x="3" y="4" width="18" height="13" rx="2" />
          <path d="M8 21h8M12 17v4" />
        </svg>
        <svg v-else-if="option.value === 'light'" aria-hidden="true" viewBox="0 0 24 24">
          <circle cx="12" cy="12" r="4" />
          <path d="M12 2v2M12 20v2M4.93 4.93l1.42 1.42M17.66 17.66l1.41 1.41M2 12h2M20 12h2M6.34 17.66l-1.41 1.41M19.07 4.93l-1.41 1.41" />
        </svg>
        <svg v-else aria-hidden="true" viewBox="0 0 24 24">
          <path d="M20.5 14.1A8.5 8.5 0 0 1 9.9 3.5 8.5 8.5 0 1 0 20.5 14.1Z" />
        </svg>
      </button>
    </div>

    <template #fallback>
      <div class="color-mode-switcher color-mode-placeholder" aria-hidden="true" />
    </template>
  </ClientOnly>
</template>

<style scoped>
.color-mode-switcher {
  display: inline-flex;
  flex: 0 0 auto;
  gap: 2px;
  padding: 2px;
  border: 1px solid var(--color-border);
  border-radius: var(--radius-pill);
  background: var(--color-background-secondary);
}

button {
  display: grid;
  width: 27px;
  height: 27px;
  padding: 0;
  place-items: center;
  border: 0;
  border-radius: 50%;
  background: transparent;
  color: var(--color-text-muted);
  cursor: pointer;
}

button:hover {
  color: var(--color-text);
}

button[aria-pressed="true"] {
  background: var(--color-background);
  color: var(--color-primary);
  box-shadow: 0 0 0 1px var(--color-border), 0 1px 3px rgb(0 0 0 / 8%);
}

button:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 1px;
}

button svg {
  width: 14px;
  height: 14px;
  fill: none;
  stroke: currentColor;
  stroke-linecap: round;
  stroke-linejoin: round;
  stroke-width: 1.8;
}

.color-mode-placeholder {
  width: 91px;
  height: 33px;
  visibility: hidden;
}
</style>
