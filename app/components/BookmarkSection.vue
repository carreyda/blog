<script setup lang="ts">
type Bookmark = { id: number; name: string; description: string; iconUrl: string | null; url: string }

const props = withDefaults(defineProps<{
  title: string
  variant?: 'group' | 'leaf'
  path?: string
  count?: number
  bookmarks: Bookmark[]
}>(), {
  variant: 'leaf',
  path: '',
})

const displayCount = computed(() => props.count ?? props.bookmarks.length)
</script>

<template>
  <div class="bookmark-section" :class="`is-${variant}`">
    <header class="section-head">
      <h2 v-if="variant === 'group'" class="section-title">{{ title }}</h2>
      <h3 v-else class="section-title">{{ title }}</h3>
      <span v-if="path" class="section-path">{{ path }}</span>
      <span class="section-count">{{ displayCount }} 个站点</span>
    </header>
    <div v-if="bookmarks.length" class="bookmark-grid">
      <BookmarkCard
        v-for="bookmark in bookmarks"
        :key="bookmark.id"
        :bookmark="bookmark"
      />
    </div>
  </div>
</template>

<style scoped>
.bookmark-section {
  min-width: 0;
}

.bookmark-section + .bookmark-section {
  margin-top: 28px;
}

.section-head {
  display: flex;
  min-width: 0;
  align-items: baseline;
  gap: 10px;
  padding: 0 2px;
}

.section-title {
  margin: 0;
  font-family: system-ui, -apple-system, 'Segoe UI', 'Microsoft YaHei UI', 'PingFang SC', sans-serif;
  letter-spacing: -.02em;
}

.is-group .section-title {
  font-size: 18px;
  font-weight: 650;
}

.is-leaf .section-title {
  font-size: 14.5px;
  font-weight: 600;
}

.section-path {
  overflow: hidden;
  color: var(--color-text-muted);
  font-family: ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, monospace;
  font-size: 10px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.section-path::before {
  margin-right: 6px;
  color: var(--color-border);
  content: '·';
}

.section-count {
  flex: 0 0 auto;
  margin-left: auto;
  color: var(--color-text-muted);
  font-family: ui-monospace, SFMono-Regular, 'SF Mono', Menlo, Consolas, monospace;
  font-size: 10.5px;
  letter-spacing: .02em;
}

.is-group .section-head {
  margin-bottom: 18px;
}

.is-leaf .section-head {
  margin-bottom: 12px;
}

.bookmark-grid {
  display: grid;
  grid-template-columns: repeat(auto-fill, minmax(280px, 1fr));
  gap: 14px;
}

@media (max-width: 720px) {
  .bookmark-grid {
    grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
    gap: 12px;
  }

  .is-group .section-title {
    font-size: 16.5px;
  }
}
</style>
