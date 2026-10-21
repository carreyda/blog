type AdminConfirmColor = 'primary' | 'secondary' | 'success' | 'info' | 'warning' | 'error' | 'neutral'

type AdminConfirmOptions = {
  title?: string
  message: string
  confirmLabel?: string
  cancelLabel?: string
  color?: AdminConfirmColor
}

const confirmState = reactive({
  open: false,
  title: '确认操作',
  message: '',
  confirmLabel: '确定',
  cancelLabel: '取消',
  color: 'primary' as AdminConfirmColor,
})

let resolveConfirm: ((value: boolean) => void) | null = null

export function useAdminConfirm() {
  function confirm(options: AdminConfirmOptions) {
    resolveConfirm?.(false)
    confirmState.title = options.title || '确认操作'
    confirmState.message = options.message
    confirmState.confirmLabel = options.confirmLabel || '确定'
    confirmState.cancelLabel = options.cancelLabel || '取消'
    confirmState.color = options.color || 'primary'
    confirmState.open = true

    return new Promise<boolean>((resolve) => {
      resolveConfirm = resolve
    })
  }

  function accept() {
    confirmState.open = false
    resolveConfirm?.(true)
    resolveConfirm = null
  }

  function cancel() {
    confirmState.open = false
    resolveConfirm?.(false)
    resolveConfirm = null
  }

  return {
    confirmState,
    confirm,
    accept,
    cancel,
  }
}
