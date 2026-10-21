<script setup lang="ts">
const { confirmState, accept, cancel } = useAdminConfirm()
</script>

<template>
  <UModal
    v-model:open="confirmState.open"
    :title="confirmState.title"
    :description="confirmState.message"
    :ui="{ footer: 'admin-confirm-footer' }"
    @after:leave="cancel"
  >
    <template #footer>
      <div class="admin-confirm-actions">
        <UButton color="neutral" variant="ghost" @click="cancel">
          {{ confirmState.cancelLabel }}
        </UButton>
        <UButton :color="confirmState.color" @click="accept">
          {{ confirmState.confirmLabel }}
        </UButton>
      </div>
    </template>
  </UModal>
</template>

<style scoped>
.admin-confirm-actions {
  display: flex;
  width: 100%;
  justify-content: flex-end;
  gap: 8px;
}
</style>
