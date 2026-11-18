<script setup lang="ts">
type Bookmark = { id: number; name: string; description: string; iconUrl: string | null; url: string }

const props = defineProps<{ bookmark: Bookmark }>()
const iconBroken = ref(false)

watch(() => props.bookmark.iconUrl, () => {
  iconBroken.value = false
})

const hostname = computed(() => {
  try {
    return new URL(props.bookmark.url).hostname.replace(/^www\./, '')
  } catch {
    return props.bookmark.url
  }
})
</script>

<template>
  <a class="bookmark-card" :href="bookmark.url" target="_blank" rel="noopener noreferrer">
    <span class="card-head">
      <span class="card-icon">
        <img
          v-if="bookmark.iconUrl && !iconBroken"
          :src="bookmark.iconUrl"
          alt=""
          loading="lazy"
          @error="iconBroken = true"
        >
        <UIcon v-else name="i-lucide-globe-2" />
      </span>
      <strong class="card-name">{{ bookmark.name }}</strong>
    </span>
    <p v-if="bookmark.description" class="card-desc">{{ bookmark.description }}</p>
    <span class="card-meta">
      <span class="card-host">{{ hostname }}</span>
      <UIcon class="card-arrow" name="i-lucide-arrow-up-right" />
    </span>
  </a>
</template>

<style scoped>
.bookmark-card {
  display: flex;
  min-width: 0;
  min-height: 142px;
  flex-direction: column;
  padding: 15px 16px 14px;
  border: 1px solid var(--color-border);
  border-radius: 11px;
  background: var(--color-background-secondary);
  color: inherit;
  text-decoration: none;
  transition: border-color .18s ease, background-color .18s ease;
}

.bookmark-card:hover {
  border-color: color-mix(in srgb, var(--color-primary) 48%, var(--color-border));
}

.bookmark-card:focus-visible {
  outline: 2px solid var(--color-primary);
  outline-offset: 2px;
}

.card-head {
  display: flex;
  min-width: 0;
  align-items: center;
  gap: 10px;
}

.card-icon {
  display: grid;
  width: 30px;
  height: 30px;
  flex: 0 0 auto;
  overflow: hidden;
  border: 1px solid var(--color-border);
  border-radius: 8px;
  background: var(--color-background);
  color: var(--color-primary);
  place-items: center;
}

.card-icon img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.card-icon svg {
  width: 15px;
  height: 15px;
}

.card-name {
  overflow: hidden;
  font-family: system-ui, -apple-system, 'Segoe UI', 'Microsoft YaHei UI', 'PingFang SC', sans-serif;
  font-size: 14px;
  font-weight: 650;
  letter-spacing: -.01em;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.card-desc {
  display: -webkit-box;
  margin: 10px 0 0;
  overflow: hidden;
  color: var(--color-text-secondary);
  font-family: system-ui, -apple-system, 'Segoe UI', 'Microsoft YaHei UI', 'PingFang SC', sans-serif;
  font-size: 12px;
  line-height: 1.65;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.card-meta {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 8px;
  margin-top: auto;
  padding-top: 14px;
  color: var(--color-text-muted);
  font-family: ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, monospace;
  font-size: 10px;
  letter-spacing: .01em;
}

.card-host {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.card-arrow {
  width: 12px;
  height: 12px;
  flex: 0 0 auto;
  transition: color .18s ease, transform .18s ease;
}

.bookmark-card:hover .card-arrow {
  color: var(--color-primary);
  transform: translate(1px, -1px);
}
</style>
