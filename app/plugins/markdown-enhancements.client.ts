type MermaidRenderResult = { svg: string; bindFunctions?: (element: Element) => void }
type MermaidApi = {
  initialize: (options: Record<string, unknown>) => void
  render: (id: string, source: string) => Promise<MermaidRenderResult>
}

declare global {
  interface Window { mermaid?: MermaidApi }
}

const MERMAID_SCRIPT_ID = 'blog-mermaid-runtime'
let mermaidLoader: Promise<MermaidApi> | null = null
let diagramSequence = 0

function loadMermaid() {
  if (window.mermaid) return Promise.resolve(window.mermaid)
  if (mermaidLoader) return mermaidLoader

  mermaidLoader = new Promise<MermaidApi>((resolve, reject) => {
    const resolveRuntime = () => window.mermaid ? resolve(window.mermaid) : reject(new Error('Mermaid runtime unavailable'))
    const existing = document.getElementById(MERMAID_SCRIPT_ID) as HTMLScriptElement | null
    if (existing) {
      existing.addEventListener('load', resolveRuntime, { once: true })
      existing.addEventListener('error', () => reject(new Error('Mermaid runtime failed to load')), { once: true })
      return
    }

    const script = document.createElement('script')
    script.id = MERMAID_SCRIPT_ID
    script.src = '/vendor/vditor/dist/js/mermaid/mermaid.min.js?v=11.16.1'
    script.async = true
    script.addEventListener('load', resolveRuntime, { once: true })
    script.addEventListener('error', () => reject(new Error('Mermaid runtime failed to load')), { once: true })
    document.head.appendChild(script)
  })

  return mermaidLoader
}

function addCodeCopyButtons() {
  document.querySelectorAll<HTMLElement>('.markdown-body pre:not(.language-mermaid)').forEach((pre) => {
    if (pre.querySelector('.code-copy')) return
    const button = document.createElement('button')
    button.className = 'code-copy'
    button.type = 'button'
    button.textContent = '复制'
    button.addEventListener('click', async () => {
      const code = pre.querySelector('code')?.textContent || ''
      await navigator.clipboard.writeText(code)
      button.textContent = '已复制'
      window.setTimeout(() => { button.textContent = '复制' }, 1200)
    })
    pre.appendChild(button)
  })
}

async function renderMermaidDiagrams(theme: 'light' | 'dark') {
  const diagrams = Array.from(document.querySelectorAll<HTMLElement>('.markdown-body .language-mermaid'))
  if (!diagrams.length) return

  const mermaid = await loadMermaid()
  mermaid.initialize({
    startOnLoad: false,
    securityLevel: 'strict',
    theme: theme === 'dark' ? 'dark' : 'default',
    fontFamily: 'system-ui, sans-serif',
    flowchart: { htmlLabels: true, useMaxWidth: true },
    sequence: { useMaxWidth: true },
  })

  for (const diagram of diagrams) {
    const source = diagram.dataset.mermaidSource || diagram.textContent || ''
    if (!source.trim()) continue
    diagram.dataset.mermaidSource = source
    diagram.classList.remove('mermaid-error')
    diagram.removeAttribute('title')

    try {
      const id = `mermaid${Date.now()}${diagramSequence++}`
      const result = await mermaid.render(id, source)
      diagram.innerHTML = result.svg
      result.bindFunctions?.(diagram)
      diagram.setAttribute('role', 'img')
      diagram.setAttribute('aria-label', 'Mermaid 图表')
    } catch (error) {
      diagram.textContent = source
      diagram.classList.add('mermaid-error')
      diagram.setAttribute('title', error instanceof Error ? error.message : 'Mermaid 图表渲染失败')
    }
  }
}

export default defineNuxtPlugin((nuxtApp) => {
  const colorMode = useColorMode()
  const enhanceMarkdown = async () => {
    await nextTick()
    addCodeCopyButtons()
    try {
      await renderMermaidDiagrams(colorMode.value === 'dark' ? 'dark' : 'light')
    } catch (error) {
      console.error('Mermaid diagrams failed to render', error)
    }
  }

  nuxtApp.hook('page:finish', enhanceMarkdown)
  watch(() => colorMode.value, () => { void enhanceMarkdown() })
})
