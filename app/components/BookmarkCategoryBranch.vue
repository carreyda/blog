<script setup lang="ts">
type Bookmark = { id: number; name: string; description: string; iconUrl: string | null; url: string }
type Category = { id: number; name: string; bookmarks: Bookmark[]; children: Category[] }

const props = withDefaults(defineProps<{ category: Category; depth?: number }>(), { depth: 0 })
const brokenIcons = ref(new Set<number>())
const count = computed(() => categoryCount(props.category))

function categoryCount(category: Category): number {
  return category.bookmarks.length + category.children.reduce((sum, child) => sum + categoryCount(child), 0)
}

function markIconBroken(id: number) {
  brokenIcons.value = new Set([...brokenIcons.value, id])
}

function hostname(url: string) {
  try { return new URL(url).hostname.replace(/^www\./, '') } catch { return url }
}
</script>

<template>
  <section
    :id="`bookmark-category-${category.id}`"
    class="category-section"
    :class="{ 'is-nested': depth > 0 }"
  >
    <header class="category-heading" :class="{ 'is-nested': depth > 0 }">
      <span class="category-icon">
        <UIcon :name="depth === 0 ? 'i-lucide-folder' : 'i-lucide-folder-open'" />
      </span>
      <div>
        <component :is="depth === 0 ? 'h2' : 'h3'" class="category-title">{{ category.name }}</component>
        <p>{{ count }} 个站点</p>
      </div>
    </header>

    <div v-if="category.bookmarks.length" class="bookmark-grid">
      <a
        v-for="bookmark in category.bookmarks"
        :key="bookmark.id"
        class="bookmark-card"
        :href="bookmark.url"
        target="_blank"
        rel="noopener noreferrer"
      >
        <span class="site-icon">
          <img
            v-if="bookmark.iconUrl && !brokenIcons.has(bookmark.id)"
            :src="bookmark.iconUrl"
            alt=""
            loading="lazy"
            @error="markIconBroken(bookmark.id)"
          >
          <UIcon v-else name="i-lucide-globe-2" />
        </span>
        <span class="site-content">
          <strong>{{ bookmark.name }}</strong>
          <p>{{ bookmark.description }}</p>
          <small>{{ hostname(bookmark.url) }}</small>
        </span>
        <UIcon class="external-icon" name="i-lucide-arrow-up-right" />
      </a>
    </div>

    <div v-if="category.children.length" class="category-children">
      <BookmarkCategoryBranch
        v-for="child in category.children"
        :key="child.id"
        :category="child"
        :depth="depth + 1"
      />
    </div>
  </section>
</template>

<style scoped>
.category-section {
  scroll-margin-top: calc(var(--site-header-height) + 26px);
}

.category-heading {
  display: flex;
  align-items: center;
  gap: 12px;
  margin-bottom: 18px;
  padding-bottom: 14px;
  border-bottom: 1px solid var(--color-border);
}

.category-heading.is-nested {
  margin-bottom: 14px;
  padding-bottom: 10px;
}

.category-icon {
  display: grid;
  width: 36px;
  height: 36px;
  flex: 0 0 auto;
  place-items: center;
  border-radius: 10px;
  color: var(--color-primary);
  background: color-mix(in srgb, var(--color-primary) 11%, transparent);
}

.category-heading.is-nested .category-icon {
  width: 30px;
  height: 30px;
  border-radius: 8px;
}

.category-icon svg {
  width: 17px;
  height: 17px;
}

.category-heading.is-nested .category-icon svg {
  width: 15px;
  height: 15px;
}

.category-title {
  margin: 0;
  font-family: system-ui, "Microsoft YaHei UI", sans-serif;
  font-size: 20px;
  letter-spacing: -.025em;
}

.category-heading.is-nested .category-title {
  font-size: 15.5px;
  letter-spacing: -.015em;
}

.category-heading p {
  margin: 4px 0 0;
  color: var(--color-text-muted);
  font-size: 10px;
}

.bookmark-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(280px, 1fr));
  gap: 14px;
}

.category-section.is-nested .bookmark-grid {
  grid-template-columns: repeat(auto-fit, minmax(240px, 1fr));
}

.bookmark-card {
  position: relative;
  display: grid;
  min-height: 126px;
  grid-template-columns: 42px minmax(0, 1fr);
  align-items: start;
  gap: 13px;
  padding: 17px;
  border: 1px solid var(--color-border);
  border-radius: 12px;
  background: var(--color-background);
  transition: border-color .18s ease, transform .18s ease, box-shadow .18s ease;
}

.bookmark-card:hover {
  border-color: color-mix(in srgb, var(--color-primary) 55%, var(--color-border));
  transform: translateY(-2px);
  box-shadow: 0 12px 30px rgba(0, 0, 0, .07);
}

.site-icon {
  display: grid;
  width: 42px;
  height: 42px;
  overflow: hidden;
  place-items: center;
  border: 1px solid var(--color-border);
  border-radius: 11px;
  color: var(--color-primary);
  background: var(--color-background-secondary);
}

.site-icon img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.site-icon svg {
  width: 18px;
  height: 18px;
}

.site-content {
  display: block;
  min-width: 0;
}

.site-content strong {
  display: block;
  padding-right: 22px;
  overflow: hidden;
  font-family: system-ui, "Microsoft YaHei UI", sans-serif;
  font-size: 14.5px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.site-content p {
  display: -webkit-box;
  margin: 7px 0;
  overflow: hidden;
  color: var(--color-text-secondary);
  font-size: 11.5px;
  line-height: 1.6;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 2;
}

.site-content small {
  display: block;
  overflow: hidden;
  color: var(--color-text-muted);
  font-size: 10px;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.external-icon {
  position: absolute;
  top: 17px;
  right: 16px;
  width: 15px;
  height: 15px;
  color: var(--color-text-muted);
  transition: color .18s ease, transform .18s ease;
}

.bookmark-card:hover .external-icon {
  color: var(--color-primary);
  transform: translate(2px, -2px);
}

.category-children {
  display: grid;
  gap: 26px;
  margin-top: 18px;
}

.category-section.is-nested {
  margin-left: 22px;
  padding-left: 18px;
  border-left: 1px solid var(--color-border);
}
</style>
