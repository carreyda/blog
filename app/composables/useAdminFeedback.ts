export function useAdminFeedback() {
  const toast = useToast()

  function notifySuccess(title: string) {
    toast.add({ title, color: 'success', icon: 'i-lucide-circle-check', duration: 4000 })
  }

  function notifyError(error: unknown, title: string) {
    const data = (error as { data?: { error?: { message?: string }; message?: string } } | null)?.data
    const description = data?.error?.message || data?.message
      || (error instanceof Error ? error.message : '') || '请稍后重试。'
    toast.add({ title, description, color: 'error', icon: 'i-lucide-circle-alert', duration: 6000 })
  }

  return { notifySuccess, notifyError }
}
