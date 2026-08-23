import MarkdownIt from 'markdown-it'
import sanitizeHtml from 'sanitize-html'
import { createHighlighter } from 'shiki'

const highlighterPromise = createHighlighter({
  themes: ['github-dark'],
  langs: ['text', 'bash', 'shell', 'javascript', 'typescript', 'json', 'html', 'css', 'vue', 'sql', 'markdown', 'yaml', 'python', 'java', 'go', 'rust'],
})

function slugify(value: string) {
  return value.toLowerCase().trim().replace(/[^\p{L}\p{N}\s-]/gu, '').replace(/[\s_-]+/g, '-').replace(/^-|-$/g, '') || 'section'
}

export function readingMinutes(markdown: string) {
  const plain = markdown.replace(/```[\s\S]*?```/g, ' ').replace(/`[^`]*`/g, ' ').replace(/!?(?:\[[^\]]*\])\([^)]*\)/g, ' ')
  const cjk = plain.match(/[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/gu)?.length || 0
  const words = plain.replace(/[\p{Script=Han}\p{Script=Hiragana}\p{Script=Katakana}\p{Script=Hangul}]/gu, ' ').match(/[\p{L}\p{N}]+/gu)?.length || 0
  return Math.max(1, Math.ceil((cjk + words) / 300))
}

export async function renderMarkdown(markdown: string) {
  const highlighter = await highlighterPromise
  const usedIds = new Map<string, number>()
  const toc: { id: string; text: string; level: number }[] = []
  const md = new MarkdownIt({
    html: false,
    linkify: true,
    typographer: false,
    highlight(code, language) {
      const lang = language && highlighter.getLoadedLanguages().includes(language as any) ? language : 'text'
      return highlighter.codeToHtml(code, { lang, theme: 'github-dark' })
    },
  })

  md.core.ruler.after('inline', 'task-lists', (state) => {
    for (const token of state.tokens) {
      if (token.type !== 'inline' || !token.children?.length) continue
      const first = token.children[0]
      const match = first?.type === 'text' ? first.content.match(/^\[([ xX])\]\s+/) : null
      if (!first || !match) continue
      first.content = first.content.slice(match[0].length)
      const checkbox = new state.Token('html_inline', '', 0)
      checkbox.content = `<input type="checkbox" disabled${match[1]?.toLowerCase() === 'x' ? ' checked' : ''}> `
      token.children.unshift(checkbox)
    }
  })

  md.renderer.rules.heading_open = (tokens, index) => {
    const level = Number(tokens[index]?.tag?.slice(1) || '2')
    const inline = tokens[index + 1]
    const text = inline?.content || ''
    const base = slugify(text)
    const count = usedIds.get(base) || 0
    usedIds.set(base, count + 1)
    const id = count ? `${base}-${count + 1}` : base
    if (level >= 2 && level <= 4) toc.push({ id, text, level })
    return `<h${level} id="${md.utils.escapeHtml(id)}">`
  }

  const rendered = md.render(markdown)
  const html = sanitizeHtml(rendered, {
    allowedTags: [
      'p', 'br', 'hr', 'strong', 'em', 's', 'blockquote', 'ul', 'ol', 'li',
      'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'a', 'img', 'table', 'thead', 'tbody',
      'tr', 'th', 'td', 'pre', 'code', 'span', 'input',
    ],
    allowedAttributes: {
      a: ['href', 'title', 'rel'], img: ['src', 'alt', 'title', 'loading'],
      h1: ['id'], h2: ['id'], h3: ['id'], h4: ['id'], h5: ['id'], h6: ['id'],
      code: ['class'], pre: ['class', 'style'], span: ['class', 'style'], input: ['type', 'checked', 'disabled'],
      th: ['align'], td: ['align'],
    },
    allowedSchemesByTag: { a: ['http', 'https', 'mailto'], img: ['http', 'https'] },
    allowedStyles: {
      pre: { 'background-color': [/^#[0-9a-f]{3,8}$/i], color: [/^#[0-9a-f]{3,8}$/i] },
      span: { color: [/^#[0-9a-f]{3,8}$/i], 'background-color': [/^#[0-9a-f]{3,8}$/i] },
    },
    transformTags: {
      a: sanitizeHtml.simpleTransform('a', { rel: 'noopener noreferrer' }, true),
      img: sanitizeHtml.simpleTransform('img', { loading: 'lazy' }, true),
    },
  })
  return { html, toc }
}
