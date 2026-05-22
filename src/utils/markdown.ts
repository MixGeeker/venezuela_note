import MarkdownIt from 'markdown-it'
import hljs from 'highlight.js'
import type Token from 'markdown-it/lib/token.mjs'
import type Renderer from 'markdown-it/lib/renderer.mjs'
import type { Options } from 'markdown-it/lib/index.mjs'
import type { NoteContent, VaultLink } from '@/types'
import { assetRoute, noteRoute } from '@/utils/routes'

interface RenderContext {
  note?: NoteContent
  markdownLinks: VaultLink[]
  markdownImages: VaultLink[]
}

export function parseFrontmatter(raw: string): {
  frontmatter: Record<string, unknown> | null
  content: string
} {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/)
  if (!match) return { frontmatter: null, content: raw }

  const body = match[1].trim()
  if (body.startsWith('{')) {
    try {
      const frontmatter = JSON.parse(body) as Record<string, unknown>
      return { frontmatter, content: raw.slice(match[0].length) }
    } catch {
      return { frontmatter: null, content: raw.slice(match[0].length) }
    }
  }

  const frontmatter: Record<string, unknown> = {}
  for (const line of body.split('\n')) {
    const idx = line.indexOf(':')
    if (idx === -1) continue
    const key = line.slice(0, idx).trim()
    const value = line.slice(idx + 1).trim()
    if (value.startsWith('[') && value.endsWith(']')) {
      frontmatter[key] = value
        .slice(1, -1)
        .split(',')
        .map((s) => s.trim().replace(/^['"]|['"]$/g, ''))
    } else if (value === 'true' || value === 'false') {
      frontmatter[key] = value === 'true'
    } else if (/^-?\d+(?:\.\d+)?$/.test(value)) {
      frontmatter[key] = Number(value)
    } else {
      frontmatter[key] = value.replace(/^['"]|['"]$/g, '')
    }
  }

  return { frontmatter, content: raw.slice(match[0].length) }
}

export function renderMarkdown(content: string, note?: NoteContent): string {
  const context: RenderContext = {
    note,
    markdownLinks: note?.links.filter((link) => link.syntax === 'markdown' && !link.embed) ?? [],
    markdownImages: note?.links.filter((link) => link.syntax === 'markdown' && link.embed) ?? [],
  }
  const placeholders = new Map<string, string>()
  const md = createMarkdownIt(context)
  const preprocessed = preprocessObsidianSyntax(content, note, placeholders)
  const html = md.render(preprocessed)
  return restorePlaceholders(enhanceCallouts(html), placeholders)
}

function createMarkdownIt(context: RenderContext): MarkdownIt {
  const md = new MarkdownIt({
    html: false,
    linkify: true,
    typographer: true,
    highlight(str, lang) {
      if (lang && hljs.getLanguage(lang)) {
        try {
          return hljs.highlight(str, { language: lang }).value
        } catch {
          // fall through to auto-highlight
        }
      }
      return hljs.highlightAuto(str).value
    },
  })

  const slugCounts = new Map<string, number>()
  const defaultHeadingOpen = md.renderer.rules.heading_open ?? renderToken
  md.renderer.rules.heading_open = (tokens, idx, options, env, self) => {
    const inlineToken = tokens[idx + 1]
    const text = inlineToken?.type === 'inline' ? inlineToken.content : ''
    const baseSlug = slugify(text)
    const count = slugCounts.get(baseSlug) ?? 0
    slugCounts.set(baseSlug, count + 1)
    const slug = count === 0 ? baseSlug : `${baseSlug}-${count}`
    tokens[idx].attrSet('id', slug)
    return defaultHeadingOpen(tokens, idx, options, env, self)
  }

  const defaultLinkOpen = md.renderer.rules.link_open ?? renderToken
  md.renderer.rules.link_open = (tokens, idx, options, env, self) => {
    const href = tokens[idx].attrGet('href') ?? ''
    const internal = context.markdownLinks.find((link) => link.rawTarget === href)
    if (internal) {
      applyResolvedLinkAttrs(tokens[idx], internal)
    }
    return defaultLinkOpen(tokens, idx, options, env, self)
  }

  const defaultImage = md.renderer.rules.image ?? renderToken
  md.renderer.rules.image = (tokens, idx, options, env, self) => {
    const src = tokens[idx].attrGet('src') ?? ''
    const embed = context.markdownImages.find((link) => link.rawTarget === src)
    if (embed?.resolved && embed.targetType === 'attachment' && embed.targetPath) {
      tokens[idx].attrSet('src', assetRoute(embed.targetPath))
    }
    return defaultImage(tokens, idx, options, env, self)
  }

  return md
}

function preprocessObsidianSyntax(
  content: string,
  note: NoteContent | undefined,
  placeholders: Map<string, string>,
): string {
  const wikiLinks = note?.links.filter((link) => link.syntax === 'wikilink') ?? []
  let wikiIndex = 0

  return maskAwareReplace(content, /(!?)\[\[([^\]\n]+)\]\]/g, (raw, bang, inner) => {
    const rawTarget = parseWikilinkTarget(inner).target
    const link = wikiLinks.slice(wikiIndex).find((item) =>
      item.rawTarget === rawTarget && item.embed === (bang === '!'),
    )
    if (link) wikiIndex = wikiLinks.indexOf(link) + 1

    if (!link) return raw
    if (link.embed) return placeholder(placeholders, renderEmbed(link))
    if (!link.resolved) return placeholder(placeholders, renderBrokenLink(link))

    const label = link.display || displayTarget(link)
    return `[${escapeMarkdownLabel(label)}](${linkHref(link)})`
  })
    .replace(/(^|[\s({])#([A-Za-z0-9_/-]+)/g, (_match, prefix: string, tag: string) =>
      `${prefix}[#${tag}](/search?tag=${encodeURIComponent(tag)})`,
    )
    .replace(/(?:\s|^)\^([A-Za-z0-9-]+)\s*$/gm, (match, blockId: string) =>
      `${match.replace(`^${blockId}`, '')}${placeholder(placeholders, `<span id="block-${escapeAttr(blockId)}" class="obsidian-block-anchor"></span>`)}`,
    )
}

function maskAwareReplace(
  content: string,
  regex: RegExp,
  replacer: (match: string, ...captures: string[]) => string,
): string {
  const lines = content.replace(/\r\n/g, '\n').split('\n')
  let inFence = false

  return lines
    .map((line) => {
      if (/^\s*(```|~~~)/.test(line)) {
        inFence = !inFence
        return line
      }
      if (inFence) return line
      return line.replace(regex, (match, ...args) =>
        replacer(match, ...(args.slice(0, -2) as string[])),
      )
    })
    .join('\n')
}

function parseWikilinkTarget(value: string): { target: string; display?: string } {
  const pipeIndex = value.indexOf('|')
  if (pipeIndex === -1) return { target: value.trim() }
  return {
    target: value.slice(0, pipeIndex).trim(),
    display: value.slice(pipeIndex + 1).trim(),
  }
}

function applyResolvedLinkAttrs(token: Token, link: VaultLink) {
  if (link.resolved && link.targetType === 'note' && link.targetPath) {
    token.attrSet('href', noteRoute(link.targetPath, link.anchor))
    token.attrJoin('class', 'internal-link')
    return
  }

  if (link.resolved && link.targetType === 'attachment' && link.targetPath) {
    token.attrSet('href', assetRoute(link.targetPath))
    token.attrJoin('class', 'asset-link')
    return
  }

  token.attrSet('href', '#')
  token.attrSet('title', link.reason === 'ambiguous' ? 'Ambiguous Obsidian link' : 'Unresolved Obsidian link')
  token.attrJoin('class', 'broken-link')
}

function renderEmbed(link: VaultLink): string {
  if (!link.resolved || !link.targetPath) return renderBrokenLink(link)

  if (link.targetType === 'note') {
    const title = escapeHtml(link.display || link.targetPath.replace(/\.md$/i, ''))
    return `<aside class="obsidian-note-embed"><a href="${noteRoute(link.targetPath, link.anchor)}">${title}</a></aside>`
  }

  const src = assetRoute(link.targetPath)
  const name = escapeHtml(link.display || link.targetPath.split('/').pop() || link.targetPath)
  const mimeType = inferMimeType(link.targetPath)
  const size = parseEmbedSize(link.display)

  if (mimeType.startsWith('image/')) {
    const width = size.width ? ` width="${size.width}"` : ''
    const height = size.height ? ` height="${size.height}"` : ''
    return `<img class="obsidian-embed obsidian-image-embed" src="${src}" alt="${name}"${width}${height}>`
  }

  if (mimeType.startsWith('audio/')) {
    return `<audio class="obsidian-embed obsidian-audio-embed" controls src="${src}">${name}</audio>`
  }

  if (mimeType.startsWith('video/')) {
    return `<video class="obsidian-embed obsidian-video-embed" controls src="${src}">${name}</video>`
  }

  if (mimeType === 'application/pdf') {
    return `<iframe class="obsidian-embed obsidian-pdf-embed" src="${src}" title="${name}"></iframe>`
  }

  return `<a class="asset-link" href="${src}">${name}</a>`
}

function renderBrokenLink(link: VaultLink): string {
  const label = escapeHtml(link.display || link.rawTarget)
  const title = link.reason === 'ambiguous' ? 'Ambiguous Obsidian link' : 'Unresolved Obsidian link'
  return `<span class="broken-link" title="${title}">${label}</span>`
}

function enhanceCallouts(html: string): string {
  return html.replace(
    /<blockquote>\s*<p>\[!([A-Za-z0-9_-]+)(?:[+-])?\]([^\n<]*)/g,
    (_match, rawType: string, rawTitle: string) => {
      const type = rawType.toLowerCase()
      const title = escapeHtml(rawTitle.trim() || rawType)
      return `<blockquote class="obsidian-callout obsidian-callout-${type}"><p class="obsidian-callout-title">${title}`
    },
  )
}

function placeholder(placeholders: Map<string, string>, html: string): string {
  const key = `@@OBSIDIAN_HTML_${placeholders.size}@@`
  placeholders.set(key, html)
  return key
}

function restorePlaceholders(html: string, placeholders: Map<string, string>): string {
  let restored = html
  for (const [key, value] of placeholders) {
    restored = restored.split(key).join(value)
  }
  return restored
}

function linkHref(link: VaultLink): string {
  if (link.targetType === 'note' && link.targetPath) return noteRoute(link.targetPath, link.anchor)
  if (link.targetType === 'attachment' && link.targetPath) return assetRoute(link.targetPath)
  return '#'
}

function displayTarget(link: VaultLink): string {
  return link.rawTarget.split('#')[0].split('/').pop()?.replace(/\.md$/i, '') || link.rawTarget
}

function parseEmbedSize(value: string | undefined): { width?: number; height?: number } {
  if (!value) return {}
  const match = /^(\d+)(?:x(\d+))?$/.exec(value.trim())
  if (!match) return {}
  return {
    width: Number(match[1]),
    height: match[2] ? Number(match[2]) : undefined,
  }
}

function inferMimeType(path: string): string {
  const extension = path.split('.').pop()?.toLowerCase()
  switch (extension) {
    case 'avif':
      return 'image/avif'
    case 'bmp':
      return 'image/bmp'
    case 'gif':
      return 'image/gif'
    case 'jpeg':
    case 'jpg':
      return 'image/jpeg'
    case 'png':
      return 'image/png'
    case 'svg':
      return 'image/svg+xml'
    case 'webp':
      return 'image/webp'
    case 'flac':
      return 'audio/flac'
    case 'm4a':
      return 'audio/mp4'
    case 'mp3':
      return 'audio/mpeg'
    case 'ogg':
      return 'audio/ogg'
    case 'wav':
      return 'audio/wav'
    case 'mov':
      return 'video/quicktime'
    case 'mp4':
      return 'video/mp4'
    case 'webm':
      return 'video/webm'
    case 'pdf':
      return 'application/pdf'
    default:
      return 'application/octet-stream'
  }
}

function renderToken(
  tokens: Token[],
  idx: number,
  options: Options,
  _env: unknown,
  self: Renderer,
): string {
  return self.renderToken(tokens, idx, options)
}

function slugify(value: string): string {
  const slug = value
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, '')
    .replace(/\s+/g, '-')
  return slug || 'section'
}

function escapeMarkdownLabel(value: string): string {
  return value.replace(/\\/g, '\\\\').replace(/\]/g, '\\]')
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function escapeAttr(value: string): string {
  return escapeHtml(value)
}
