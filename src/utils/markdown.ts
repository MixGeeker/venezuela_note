import MarkdownIt from 'markdown-it'
import hljs from 'highlight.js'

const md = new MarkdownIt({
  html: false,
  linkify: true,
  typographer: true,
  highlight(str, lang) {
    if (lang && hljs.getLanguage(lang)) {
      try {
        return hljs.highlight(str, { language: lang }).value
      } catch {
        // fall through
      }
    }
    return hljs.highlightAuto(str).value
  },
})

export function parseFrontmatter(raw: string): {
  frontmatter: Record<string, unknown> | null
  content: string
} {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/)
  if (!match) return { frontmatter: null, content: raw }

  const yaml = match[1]
  const frontmatter: Record<string, unknown> = {}
  for (const line of yaml.split('\n')) {
    const idx = line.indexOf(':')
    if (idx === -1) continue
    const key = line.slice(0, idx).trim()
    const value = line.slice(idx + 1).trim()
    if (value.startsWith('[') && value.endsWith(']')) {
      frontmatter[key] = value
        .slice(1, -1)
        .split(',')
        .map(s => s.trim())
    } else {
      frontmatter[key] = value
    }
  }

  return { frontmatter, content: raw.slice(match[0].length) }
}

export function renderMarkdown(content: string): string {
  return md.render(content)
}
