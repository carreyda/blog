<script setup lang="ts">
definePageMeta({ layout: 'admin' })
useSeoMeta({ title: '收藏管理' })

type CategoryCount = { children: number; bookmarks: number }
type ChildCategory = { id: number; name: string; parentId: number; sort: number; _count: CategoryCount }
type RootCategory = { id: number; name: string; parentId: null; sort: number; _count: CategoryCount; children: ChildCategory[] }
type Bookmark = {
  id: number
  categoryId: number
  name: string
  description: string
  iconUrl: string | null
  url: string
  sort: number
  isVisible: boolean
  category: { id: number; name: string; parent: { id: number; name: string } | null }
}

const session = useState<{ csrfToken: string } | null>('admin-session')
const { data: categoryResponse, refresh: refreshCategories } = await useFetch<{ data: RootCategory[] }>('/api/admin/bookmark-categories')
const { data: bookmarkResponse, refresh: refreshBookmarks } = await useFetch<{ data: Bookmark[] }>('/api/admin/bookmarks')
const categories = computed(() => categoryResponse.value?.data || [])
const bookmarks = computed(() => bookmarkResponse.value?.data || [])
const childCategories = computed(() => categories.value.flatMap(parent => parent.children.map(child => ({
  ...child,
  path: `${parent.name} / ${child.name}`,
}))))

const blankCategory = () => ({ name: '', parentId: null as number | null, sort: 0 })
const categoryForm = reactive(blankCategory())
const editingCategoryId = ref<number | null>(null)
const categoryPending = ref(false)
const categoryError = ref('')

const blankBookmark = () => ({
  categoryId: childCategories.value[0]?.id || 0,
  name: '',
  description: '',
  iconUrl: '',
  url: '',
  sort: 0,
  isVisible: true,
})
const bookmarkForm = reactive(blankBookmark())
const editingBookmarkId = ref<number | null>(null)
const bookmarkPending = ref(false)
const bookmarkError = ref('')
const search = ref('')
const filterCategoryId = ref(0)
const brokenIcons = ref(new Set<number>())

const parentOptions = computed(() => categories.value
  .filter(category => category.id !== editingCategoryId.value)
  .map(category => ({ label: category.name, value: category.id })))
const categoryOptions = computed(() => childCategories.value.map(category => ({ label: category.path, value: category.id })))
const filteredBookmarks = computed(() => {
  const keyword = search.value.trim().toLocaleLowerCase()
  return bookmarks.value.filter((bookmark) => {
    if (filterCategoryId.value && bookmark.categoryId !== filterCategoryId.value) return false
    if (!keyword) return true
    return [bookmark.name, bookmark.description, bookmark.url, bookmark.category.name, bookmark.category.parent?.name]
      .some(value => value?.toLocaleLowerCase().includes(keyword))
  })
})

watch(childCategories, (items) => {
  if (!bookmarkForm.categoryId && items[0]) bookmarkForm.categoryId = items[0].id
})

function resetCategory() {
  editingCategoryId.value = null
  Object.assign(categoryForm, blankCategory())
  categoryError.value = ''
}

function editCategory(category: RootCategory | ChildCategory) {
  editingCategoryId.value = category.id
  Object.assign(categoryForm, { name: category.name, parentId: category.parentId, sort: category.sort })
  categoryError.value = ''
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

async function saveCategory() {
  if (!session.value || categoryPending.value) return
  categoryPending.value = true
  categoryError.value = ''
  try {
    await $fetch(editingCategoryId.value ? `/api/admin/bookmark-categories/${editingCategoryId.value}` : '/api/admin/bookmark-categories', {
      method: editingCategoryId.value ? 'PUT' : 'POST',
      body: { ...categoryForm, sort: Number(categoryForm.sort) },
      headers: { 'X-CSRF-Token': session.value.csrfToken },
    })
    resetCategory()
    await Promise.all([refreshCategories(), refreshBookmarks()])
  } catch (error: any) {
    categoryError.value = error?.data?.error?.message || '保存分类失败'
  } finally {
    categoryPending.value = false
  }
}

async function removeCategory(category: RootCategory | ChildCategory) {
  if (!session.value || !window.confirm(`确定删除分类“${category.name}”吗？`)) return
  categoryError.value = ''
  try {
    await $fetch(`/api/admin/bookmark-categories/${category.id}`, {
      method: 'DELETE',
      headers: { 'X-CSRF-Token': session.value.csrfToken },
    })
    if (editingCategoryId.value === category.id) resetCategory()
    await refreshCategories()
  } catch (error: any) {
    categoryError.value = error?.data?.error?.message || '删除分类失败'
  }
}

function resetBookmark() {
  editingBookmarkId.value = null
  Object.assign(bookmarkForm, blankBookmark())
  bookmarkError.value = ''
}

function editBookmark(bookmark: Bookmark) {
  editingBookmarkId.value = bookmark.id
  Object.assign(bookmarkForm, {
    categoryId: bookmark.categoryId,
    name: bookmark.name,
    description: bookmark.description,
    iconUrl: bookmark.iconUrl || '',
    url: bookmark.url,
    sort: bookmark.sort,
    isVisible: bookmark.isVisible,
  })
  bookmarkError.value = ''
  window.scrollTo({ top: 0, behavior: 'smooth' })
}

async function saveBookmark() {
  if (!session.value || bookmarkPending.value) return
  bookmarkPending.value = true
  bookmarkError.value = ''
  try {
    await $fetch(editingBookmarkId.value ? `/api/admin/bookmarks/${editingBookmarkId.value}` : '/api/admin/bookmarks', {
      method: editingBookmarkId.value ? 'PUT' : 'POST',
      body: {
        ...bookmarkForm,
        categoryId: Number(bookmarkForm.categoryId),
        sort: Number(bookmarkForm.sort),
      },
      headers: { 'X-CSRF-Token': session.value.csrfToken },
    })
    resetBookmark()
    await Promise.all([refreshBookmarks(), refreshCategories()])
  } catch (error: any) {
    bookmarkError.value = error?.data?.error?.message || '保存收藏失败'
  } finally {
    bookmarkPending.value = false
  }
}

async function removeBookmark(bookmark: Bookmark) {
  if (!session.value || !window.confirm(`确定删除收藏“${bookmark.name}”吗？`)) return
  bookmarkError.value = ''
  try {
    await $fetch(`/api/admin/bookmarks/${bookmark.id}`, {
      method: 'DELETE',
      headers: { 'X-CSRF-Token': session.value.csrfToken },
    })
    if (editingBookmarkId.value === bookmark.id) resetBookmark()
    await Promise.all([refreshBookmarks(), refreshCategories()])
  } catch (error: any) {
    bookmarkError.value = error?.data?.error?.message || '删除收藏失败'
  }
}

function markIconBroken(id: number) {
  brokenIcons.value = new Set([...brokenIcons.value, id])
}
</script>

<template>
  <section class="bookmarks-admin-page">
    <AdminPageHeader eyebrow="Resources" title="收藏管理" description="维护两级分类与公开展示的网站收藏。" />

    <div class="editor-grid">
      <UCard>
        <template #header>
          <div class="card-heading">
            <span><UIcon name="i-lucide-folders" /></span>
            <div><strong>{{ editingCategoryId ? '编辑分类' : '新增分类' }}</strong><p>一级分类可继续包含二级分类</p></div>
          </div>
        </template>
        <form class="editor-form" @submit.prevent="saveCategory">
          <UFormField label="分类名称" required><UInput v-model="categoryForm.name" class="w-full" placeholder="例如：开发资源" /></UFormField>
          <UFormField label="父分类" description="留空表示一级分类">
            <select v-model="categoryForm.parentId" class="native-select">
              <option :value="null">无（一级分类）</option>
              <option v-for="item in parentOptions" :key="item.value" :value="item.value">{{ item.label }}</option>
            </select>
          </UFormField>
          <UFormField label="排序"><UInput v-model.number="categoryForm.sort" type="number" min="-9999" max="9999" class="w-full" /></UFormField>
          <UAlert v-if="categoryError" color="error" variant="soft" :description="categoryError" />
          <div class="form-actions"><UButton type="submit" icon="i-lucide-check" :loading="categoryPending">{{ editingCategoryId ? '保存分类' : '创建分类' }}</UButton><UButton v-if="editingCategoryId" type="button" color="neutral" variant="ghost" @click="resetCategory">取消</UButton></div>
        </form>
      </UCard>

      <UCard>
        <template #header>
          <div class="card-heading">
            <span class="violet"><UIcon name="i-lucide-bookmark-plus" /></span>
            <div><strong>{{ editingBookmarkId ? '编辑收藏' : '新增收藏' }}</strong><p>收藏只能添加到二级分类</p></div>
          </div>
        </template>
        <form class="editor-form bookmark-form" @submit.prevent="saveBookmark">
          <UFormField label="所属分类" required>
            <select v-model.number="bookmarkForm.categoryId" class="native-select" :disabled="!categoryOptions.length">
              <option v-if="!categoryOptions.length" :value="0">请先创建二级分类</option>
              <option v-for="item in categoryOptions" :key="item.value" :value="item.value">{{ item.label }}</option>
            </select>
          </UFormField>
          <UFormField label="收藏名称" required><UInput v-model="bookmarkForm.name" class="w-full" placeholder="网站名称" /></UFormField>
          <UFormField label="网站 URL" required><UInput v-model="bookmarkForm.url" icon="i-lucide-link" class="w-full" placeholder="https://example.com" /></UFormField>
          <UFormField label="图标 URL" description="可留空，前台会显示默认图标"><UInput v-model="bookmarkForm.iconUrl" icon="i-lucide-image" class="w-full" placeholder="https://example.com/icon.png" /></UFormField>
          <UFormField label="描述" required class="span-two"><UTextarea v-model="bookmarkForm.description" :rows="3" class="w-full" placeholder="简要说明这个网站的用途" /></UFormField>
          <UFormField label="排序"><UInput v-model.number="bookmarkForm.sort" type="number" min="-9999" max="9999" class="w-full" /></UFormField>
          <label class="visibility-toggle"><input v-model="bookmarkForm.isVisible" type="checkbox"><span><strong>公开展示</strong><small>关闭后不会出现在前台收藏页</small></span></label>
          <UAlert v-if="bookmarkError" class="span-two" color="error" variant="soft" :description="bookmarkError" />
          <div class="form-actions span-two"><UButton type="submit" icon="i-lucide-check" :loading="bookmarkPending" :disabled="!categoryOptions.length">{{ editingBookmarkId ? '保存收藏' : '添加收藏' }}</UButton><UButton v-if="editingBookmarkId" type="button" color="neutral" variant="ghost" @click="resetBookmark">取消</UButton></div>
        </form>
      </UCard>
    </div>

    <div class="content-grid">
      <UCard class="category-card">
        <template #header><div class="list-heading"><div><strong>分类结构</strong><p>{{ categories.length }} 个一级分类，{{ childCategories.length }} 个二级分类</p></div><UBadge color="neutral" variant="subtle">{{ categories.length + childCategories.length }}</UBadge></div></template>
        <div v-if="!categories.length" class="empty-state"><UIcon name="i-lucide-folder-plus" /><strong>暂无分类</strong><p>先创建一级分类，再添加二级分类。</p></div>
        <div v-else class="category-tree">
          <section v-for="parent in categories" :key="parent.id" class="category-group">
            <div class="category-row parent-row">
              <span class="category-icon"><UIcon name="i-lucide-folder" /></span>
              <div><strong>{{ parent.name }}</strong><small>{{ parent.children.length }} 个子分类 · 排序 {{ parent.sort }}</small></div>
              <div class="row-actions"><UButton icon="i-lucide-pencil" size="xs" color="neutral" variant="ghost" square :aria-label="`编辑 ${parent.name}`" @click="editCategory(parent)" /><UButton icon="i-lucide-trash-2" size="xs" color="error" variant="ghost" square :aria-label="`删除 ${parent.name}`" @click="removeCategory(parent)" /></div>
            </div>
            <div v-for="child in parent.children" :key="child.id" class="category-row child-row">
              <span class="tree-line" />
              <span class="category-icon"><UIcon name="i-lucide-folder-open" /></span>
              <div><strong>{{ child.name }}</strong><small>{{ child._count.bookmarks }} 个收藏 · 排序 {{ child.sort }}</small></div>
              <div class="row-actions"><UButton icon="i-lucide-pencil" size="xs" color="neutral" variant="ghost" square :aria-label="`编辑 ${child.name}`" @click="editCategory(child)" /><UButton icon="i-lucide-trash-2" size="xs" color="error" variant="ghost" square :aria-label="`删除 ${child.name}`" @click="removeCategory(child)" /></div>
            </div>
          </section>
        </div>
      </UCard>

      <UCard class="bookmark-list-card">
        <template #header>
          <div class="bookmark-list-header">
            <div class="list-heading"><div><strong>全部收藏</strong><p>显示 {{ filteredBookmarks.length }} / {{ bookmarks.length }} 项</p></div></div>
            <div class="filters"><UInput v-model="search" icon="i-lucide-search" placeholder="搜索名称、描述或网址" /><select v-model.number="filterCategoryId" class="native-select compact"><option :value="0">全部分类</option><option v-for="item in categoryOptions" :key="item.value" :value="item.value">{{ item.label }}</option></select></div>
          </div>
        </template>
        <div v-if="!filteredBookmarks.length" class="empty-state"><UIcon name="i-lucide-bookmark" /><strong>暂无收藏</strong><p>添加网站后会在这里集中管理。</p></div>
        <div v-else class="bookmark-list">
          <article v-for="bookmark in filteredBookmarks" :key="bookmark.id" class="bookmark-row">
            <span class="bookmark-icon">
              <img v-if="bookmark.iconUrl && !brokenIcons.has(bookmark.id)" :src="bookmark.iconUrl" alt="" @error="markIconBroken(bookmark.id)">
              <UIcon v-else name="i-lucide-globe-2" />
            </span>
            <div class="bookmark-info"><div><strong>{{ bookmark.name }}</strong><UBadge :color="bookmark.isVisible ? 'success' : 'neutral'" variant="subtle" size="sm">{{ bookmark.isVisible ? '公开' : '隐藏' }}</UBadge></div><p>{{ bookmark.description }}</p><small>{{ bookmark.category.parent?.name }} / {{ bookmark.category.name }} · 排序 {{ bookmark.sort }}</small></div>
            <a class="bookmark-url" :href="bookmark.url" target="_blank" rel="noopener noreferrer">{{ bookmark.url }}<UIcon name="i-lucide-external-link" /></a>
            <div class="row-actions"><UButton icon="i-lucide-pencil" size="xs" color="neutral" variant="ghost" square :aria-label="`编辑 ${bookmark.name}`" @click="editBookmark(bookmark)" /><UButton icon="i-lucide-trash-2" size="xs" color="error" variant="ghost" square :aria-label="`删除 ${bookmark.name}`" @click="removeBookmark(bookmark)" /></div>
          </article>
        </div>
      </UCard>
    </div>
  </section>
</template>

<style scoped>
.bookmarks-admin-page{display:grid;gap:26px}.editor-grid{display:grid;grid-template-columns:minmax(280px,.72fr) minmax(480px,1.28fr);gap:18px;align-items:start}.card-heading{display:flex;align-items:center;gap:11px}.card-heading>span{display:grid;width:36px;height:36px;place-items:center;border-radius:10px;color:#18745d;background:rgba(16,185,129,.12)}.card-heading>span.violet{color:#7757cf;background:rgba(139,92,246,.12)}.card-heading strong,.list-heading strong{display:block;font-size:13.5px;font-weight:680}.card-heading p,.list-heading p{margin:3px 0 0;color:var(--color-text-muted);font-size:10.5px}.editor-form{display:grid;gap:17px}.bookmark-form{grid-template-columns:repeat(2,minmax(0,1fr))}.span-two{grid-column:1/-1}.native-select{width:100%;min-height:34px;padding:0 34px 0 11px;border:1px solid var(--color-border);border-radius:7px;outline:0;color:var(--color-text);background:var(--color-background);font:inherit;font-size:12px}.native-select:focus{border-color:var(--color-primary);box-shadow:0 0 0 3px color-mix(in srgb,var(--color-primary) 12%,transparent)}.native-select:disabled{cursor:not-allowed;opacity:.5}.form-actions{display:flex;gap:8px;padding-top:2px}.visibility-toggle{display:flex;min-height:58px;align-items:center;gap:10px;padding:9px 12px;border:1px solid var(--color-border);border-radius:8px;cursor:pointer}.visibility-toggle input{width:16px;height:16px;accent-color:var(--color-primary)}.visibility-toggle span{display:grid;gap:3px}.visibility-toggle strong{font-size:11.5px}.visibility-toggle small{color:var(--color-text-muted);font-size:9.5px}.content-grid{display:grid;grid-template-columns:minmax(290px,.72fr) minmax(0,1.28fr);gap:18px;align-items:start}.list-heading{display:flex;align-items:center;justify-content:space-between;gap:16px}.category-tree,.bookmark-list{display:grid}.category-group+.category-group{margin-top:7px;padding-top:7px;border-top:1px solid var(--color-border)}.category-row{display:grid;grid-template-columns:34px minmax(0,1fr) auto;align-items:center;gap:10px;min-height:54px;padding:8px;border-radius:8px}.category-row:hover,.bookmark-row:hover{background:var(--color-background-secondary)}.category-row>div:nth-of-type(1){display:grid;gap:3px}.category-row strong{font-size:11.5px}.category-row small{color:var(--color-text-muted);font-size:9.5px}.category-icon{display:grid;width:32px;height:32px;place-items:center;border-radius:8px;color:var(--color-primary);background:color-mix(in srgb,var(--color-primary) 10%,transparent)}.child-row{position:relative;margin-left:24px;grid-template-columns:34px minmax(0,1fr) auto}.tree-line{position:absolute;left:-9px;width:18px;height:27px;border-bottom:1px solid var(--color-border);border-left:1px solid var(--color-border);border-bottom-left-radius:7px}.row-actions{display:flex;justify-content:flex-end;gap:2px}.bookmark-list-header{display:grid;gap:14px}.filters{display:grid;grid-template-columns:minmax(180px,1fr) 210px;gap:8px}.native-select.compact{min-height:32px}.bookmark-row{display:grid;grid-template-columns:42px minmax(180px,1fr) minmax(150px,.8fr) 64px;align-items:center;gap:12px;padding:13px 8px;border-top:1px solid var(--color-border)}.bookmark-row:first-child{border-top:0}.bookmark-icon{display:grid;width:40px;height:40px;overflow:hidden;place-items:center;border:1px solid var(--color-border);border-radius:11px;color:var(--color-text-secondary);background:var(--color-background)}.bookmark-icon img{width:100%;height:100%;object-fit:cover}.bookmark-icon svg{width:18px;height:18px}.bookmark-info{min-width:0}.bookmark-info>div{display:flex;align-items:center;gap:7px}.bookmark-info strong{overflow:hidden;font-size:12px;text-overflow:ellipsis;white-space:nowrap}.bookmark-info p{display:-webkit-box;margin:5px 0;color:var(--color-text-secondary);overflow:hidden;font-size:10.5px;line-height:1.5;-webkit-box-orient:vertical;-webkit-line-clamp:2}.bookmark-info small{color:var(--color-text-muted);font-size:9.5px}.bookmark-url{display:flex;min-width:0;align-items:center;gap:5px;overflow:hidden;color:var(--color-primary);font-size:9.5px;text-overflow:ellipsis;white-space:nowrap}.bookmark-url svg{width:12px;flex:0 0 auto}.empty-state{display:grid;min-height:230px;place-items:center;align-content:center;gap:8px;text-align:center}.empty-state>svg{width:25px;height:25px;margin-bottom:3px;color:var(--color-text-muted)}.empty-state strong{font-size:12.5px}.empty-state p{margin:0;color:var(--color-text-muted);font-size:10.5px}
@media(max-width:1100px){.editor-grid,.content-grid{grid-template-columns:1fr}}@media(max-width:680px){.bookmark-form,.filters{grid-template-columns:1fr}.span-two{grid-column:auto}.bookmark-row{grid-template-columns:42px minmax(0,1fr) 64px}.bookmark-url{display:none}}
</style>
