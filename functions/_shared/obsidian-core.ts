export type VaultNodeType = 'file' | 'dir'

export interface VaultSourceEntry {
  name: string
  path: string
  type: VaultNodeType
  sha?: string
  size?: number
  content?: string
}

export interface ParsedFrontmatter {
  frontmatter: Record<string, unknown> | null
  content: string
}

export interface NoteHeading {
  level: number
  text: string
  slug: string
}

export interface BlockReference {
  id: string
  slug: string
}

export type LinkSyntax = 'wikilink' | 'markdown'
export type LinkTargetType = 'note' | 'attachment'

export interface VaultLink {
  id: string
  syntax: LinkSyntax
  sourcePath: string
  raw: string
  rawTarget: string
  display?: string
  embed: boolean
  resolved: boolean
  targetType?: LinkTargetType
  targetPath?: string
  anchor?: string
  blockId?: string
  reason?: 'not_found' | 'ambiguous'
  candidates?: string[]
}

export interface LinkDiagnostic {
  sourcePath: string
  rawTarget: string
  message: string
  reason: 'not_found' | 'ambiguous'
  candidates?: string[]
}

export interface Backlink {
  sourcePath: string
  sourceTitle: string
  display: string
  anchor?: string
}

export interface VaultNote {
  name: string
  path: string
  type: 'file'
  sha: string
  size: number
  title: string
  aliases: string[]
  tags: string[]
  permalink?: string
  published: boolean
  frontmatter: Record<string, unknown> | null
  content: string
  headings: NoteHeading[]
  blocks: BlockReference[]
  outboundLinks: VaultLink[]
  backlinks: Backlink[]
  diagnostics: LinkDiagnostic[]
}

export interface AttachmentMeta {
  name: string
  path: string
  type: 'file'
  sha: string
  size: number
  mimeType: string
}

export interface VaultIndex {
  notes: VaultNote[]
  attachments: AttachmentMeta[]
  tags: Array<{ tag: string; count: number; notes: string[] }>
  aliases: Record<string, string[]>
  brokenLinks: LinkDiagnostic[]
  orphanNotes: string[]
  graph: {
    nodes: Array<{ id: string; title: string }>
    edges: Array<{ source: string; target: string }>
  }
}

const MARKDOWN_EXT = '.md'
const SKIPPED_DIRS = new Set(['.obsidian', '.trash'])

const MIME_TYPES: Record<string, string> = {
  '.avif': 'image/avif',
  '.bmp': 'image/bmp',
  '.gif': 'image/gif',
  '.jpeg': 'image/jpeg',
  '.jpg': 'image/jpeg',
  '.png': 'image/png',
  '.svg': 'image/svg+xml',
  '.webp': 'image/webp',
  '.flac': 'audio/flac',
  '.m4a': 'audio/mp4',
  '.mp3': 'audio/mpeg',
  '.ogg': 'audio/ogg',
  '.wav': 'audio/wav',
  '.mov': 'video/quicktime',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.pdf': 'application/pdf',
}

export function normalizeVaultPath(input: string): string | null {
  const decoded = safeDecodeURIComponent(input)
  const parts = decoded
    .replace(/\\/g, '/')
    .split('/')
    .filter(Boolean)

  const normalized: string[] = []
  for (const part of parts) {
    if (part === '.') continue
    if (part === '..') return null
    normalized.push(part)
  }

  return normalized.join('/')
}

export function isHiddenOrPrivatePath(path: string): boolean {
  const normalized = normalizeVaultPath(path)
  if (normalized === null) return true
  return normalized.split('/').some((segment) => segment.startsWith('.') || SKIPPED_DIRS.has(segment))
}

export function isMarkdownPath(path: string): boolean {
  return path.toLowerCase().endsWith(MARKDOWN_EXT)
}

export function isAttachmentPath(path: string): boolean {
  return getMimeType(path) !== 'application/octet-stream'
}

export function getMimeType(path: string): string {
  return MIME_TYPES[getExtension(path)] ?? 'application/octet-stream'
}

export function parseFrontmatter(raw: string): ParsedFrontmatter {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---(?:\r?\n|$)/)
  if (!match) return { frontmatter: null, content: raw }

  const body = match[1].trim()
  const frontmatter = body.startsWith('{')
    ? parseJsonFrontmatter(body)
    : parseYamlFrontmatter(body)

  return {
    frontmatter,
    content: raw.slice(match[0].length),
  }
}

export function buildVaultIndexFromEntries(entries: VaultSourceEntry[]): VaultIndex {
  const noteDrafts: VaultNote[] = []
  const attachments: AttachmentMeta[] = []

  for (const entry of entries) {
    const path = normalizeVaultPath(entry.path)
    if (!path || isHiddenOrPrivatePath(path) || entry.type !== 'file') continue

    if (isMarkdownPath(path) && typeof entry.content === 'string') {
      const parsed = parseFrontmatter(entry.content)
      const published = isPublished(parsed.frontmatter)
      if (!published) continue

      const inlineTags = extractInlineTags(parsed.content)
      const tags = uniqueStrings([...frontmatterStringList(parsed.frontmatter, 'tags'), ...inlineTags])
      const aliases = uniqueStrings([
        ...frontmatterStringList(parsed.frontmatter, 'aliases'),
        ...frontmatterStringList(parsed.frontmatter, 'alias'),
      ])

      noteDrafts.push({
        name: basename(path),
        path,
        type: 'file',
        sha: entry.sha ?? '',
        size: entry.size ?? entry.content.length,
        title: frontmatterString(parsed.frontmatter, 'title') ?? displayName(path),
        aliases,
        tags,
        permalink: normalizePermalink(frontmatterString(parsed.frontmatter, 'permalink')),
        published,
        frontmatter: parsed.frontmatter,
        content: parsed.content,
        headings: extractHeadings(parsed.content),
        blocks: extractBlockReferences(parsed.content),
        outboundLinks: [],
        backlinks: [],
        diagnostics: [],
      })
    } else if (isAttachmentPath(path)) {
      attachments.push({
        name: basename(path),
        path,
        type: 'file',
        sha: entry.sha ?? '',
        size: entry.size ?? 0,
        mimeType: getMimeType(path),
      })
    }
  }

  const context = createResolveContext(noteDrafts, attachments)
  const brokenLinks: LinkDiagnostic[] = []
  const graphEdges = new Set<string>()

  for (const note of noteDrafts) {
    note.outboundLinks = extractLinks(note.content, note.path).map((link) =>
      resolveVaultLink(link, context),
    )

    for (const link of note.outboundLinks) {
      if (link.resolved && link.targetType === 'note' && link.targetPath) {
        graphEdges.add(`${note.path}\u0000${link.targetPath}`)
        if (link.targetPath !== note.path) {
          const target = context.notesByPath.get(link.targetPath)
          target?.backlinks.push({
            sourcePath: note.path,
            sourceTitle: note.title,
            display: link.display || note.title,
            anchor: link.anchor,
          })
        }
        continue
      }

      if (!link.resolved) {
        const diagnostic: LinkDiagnostic = {
          sourcePath: note.path,
          rawTarget: link.rawTarget,
          reason: link.reason ?? 'not_found',
          candidates: link.candidates,
          message: link.reason === 'ambiguous'
            ? `Ambiguous link "${link.rawTarget}"`
            : `Unresolved link "${link.rawTarget}"`,
        }
        note.diagnostics.push(diagnostic)
        brokenLinks.push(diagnostic)
      }
    }
  }

  const tags = buildTagIndex(noteDrafts)
  const aliases = buildAliasRecord(noteDrafts)
  const orphanNotes = noteDrafts
    .filter((note) => {
      const outboundNoteLinks = note.outboundLinks.filter((link) =>
        link.resolved && link.targetType === 'note' && link.targetPath !== note.path,
      )
      return note.backlinks.length === 0 && outboundNoteLinks.length === 0
    })
    .map((note) => note.path)

  return {
    notes: noteDrafts.sort((a, b) => a.path.localeCompare(b.path)),
    attachments: attachments.sort((a, b) => a.path.localeCompare(b.path)),
    tags,
    aliases,
    brokenLinks,
    orphanNotes,
    graph: {
      nodes: noteDrafts.map((note) => ({ id: note.path, title: note.title })),
      edges: Array.from(graphEdges).map((edge) => {
        const [source, target] = edge.split('\u0000')
        return { source, target }
      }),
    },
  }
}

export function findNoteByRequestPath(index: VaultIndex, requestPath: string): VaultNote | undefined {
  const normalized = normalizeVaultPath(requestPath)
  if (!normalized) return undefined

  const decoded = normalized.replace(/\/index\.md$/i, '')
  return index.notes.find((note) =>
    note.path === normalized ||
    note.path === `${normalized}.md` ||
    note.permalink === normalizePermalink(decoded) ||
    note.permalink === normalizePermalink(normalized),
  )
}

export function buildTreeFromIndex(index: VaultIndex): TreeNode[] {
  const root: TreeDir = { name: '', path: '', type: 'dir', children: [] }

  for (const note of index.notes) {
    const parts = note.path.split('/')
    let current = root

    for (let i = 0; i < parts.length - 1; i += 1) {
      const dirPath = parts.slice(0, i + 1).join('/')
      let next = current.children.find((child): child is TreeDir =>
        child.type === 'dir' && child.path === dirPath,
      )
      if (!next) {
        next = { name: parts[i], path: dirPath, type: 'dir', children: [] }
        current.children.push(next)
      }
      current = next
    }

    current.children.push({
      name: note.name,
      path: note.path,
      type: 'file',
      sha: note.sha,
      size: note.size,
      title: note.title,
      aliases: note.aliases,
      tags: note.tags,
      permalink: note.permalink,
      published: note.published,
      headings: note.headings,
      outboundLinks: note.outboundLinks,
      backlinks: note.backlinks,
    })
  }

  sortTree(root.children)
  return root.children
}

export function publicVaultIndex(index: VaultIndex): PublicVaultIndex {
  return {
    notes: index.notes.map((note) => ({
      name: note.name,
      path: note.path,
      type: 'file',
      sha: note.sha,
      size: note.size,
      title: note.title,
      aliases: note.aliases,
      tags: note.tags,
      permalink: note.permalink,
      published: note.published,
      headings: note.headings,
      outboundLinks: note.outboundLinks,
      backlinks: note.backlinks,
      diagnostics: note.diagnostics,
    })),
    attachments: index.attachments,
    tags: index.tags,
    aliases: index.aliases,
    brokenLinks: index.brokenLinks,
    orphanNotes: index.orphanNotes,
    graph: index.graph,
  }
}

export interface TreeFile {
  name: string
  path: string
  type: 'file'
  sha: string
  size: number
  title: string
  aliases: string[]
  tags: string[]
  permalink?: string
  published: boolean
  headings: NoteHeading[]
  outboundLinks: VaultLink[]
  backlinks: Backlink[]
}

export interface TreeDir {
  name: string
  path: string
  type: 'dir'
  children: TreeNode[]
}

export type TreeNode = TreeFile | TreeDir

export interface PublicVaultIndex {
  notes: Array<TreeFile & { diagnostics: LinkDiagnostic[] }>
  attachments: AttachmentMeta[]
  tags: VaultIndex['tags']
  aliases: VaultIndex['aliases']
  brokenLinks: LinkDiagnostic[]
  orphanNotes: string[]
  graph: VaultIndex['graph']
}

interface ResolveContext {
  notes: VaultNote[]
  notesByPath: Map<string, VaultNote>
  attachmentsByPath: Map<string, AttachmentMeta>
  notesByBase: Map<string, string[]>
  attachmentsByBase: Map<string, string[]>
  aliases: Map<string, string[]>
}

function parseJsonFrontmatter(body: string): Record<string, unknown> | null {
  try {
    const value = JSON.parse(body)
    return isRecord(value) ? value : null
  } catch {
    return null
  }
}

function parseYamlFrontmatter(body: string): Record<string, unknown> {
  const result: Record<string, unknown> = {}
  const lines = body.replace(/\r\n/g, '\n').split('\n')

  for (let i = 0; i < lines.length; i += 1) {
    const rawLine = lines[i]
    const trimmed = rawLine.trim()
    if (!trimmed || trimmed.startsWith('#') || rawLine.startsWith(' ')) continue

    const idx = trimmed.indexOf(':')
    if (idx === -1) continue

    const key = trimmed.slice(0, idx).trim()
    const rawValue = trimmed.slice(idx + 1).trim()

    if (rawValue) {
      result[key] = parseYamlValue(rawValue)
      continue
    }

    const values: unknown[] = []
    let cursor = i + 1
    while (cursor < lines.length) {
      const child = lines[cursor]
      const childTrimmed = child.trim()
      if (!child.startsWith(' ') && !child.startsWith('\t')) break
      if (childTrimmed.startsWith('- ')) {
        values.push(parseYamlValue(childTrimmed.slice(2).trim()))
      }
      cursor += 1
    }

    result[key] = values
    i = cursor - 1
  }

  return result
}

function parseYamlValue(value: string): unknown {
  const withoutComment = stripInlineComment(value).trim()
  const lowerValue = withoutComment.toLowerCase()
  if (!withoutComment) return ''
  if (lowerValue === 'true') return true
  if (lowerValue === 'false') return false
  if (lowerValue === 'null' || withoutComment === '~') return null
  if (isQuoted(withoutComment)) return withoutComment.slice(1, -1)
  if (withoutComment.startsWith('[') && withoutComment.endsWith(']')) {
    return splitInlineList(withoutComment.slice(1, -1)).map(parseYamlValue)
  }
  if (/^-?\d+(?:\.\d+)?$/.test(withoutComment)) return Number(withoutComment)
  return withoutComment
}

function splitInlineList(value: string): string[] {
  const result: string[] = []
  let current = ''
  let quote: '"' | "'" | null = null

  for (const char of value) {
    if ((char === '"' || char === "'") && quote === null) {
      quote = char
    } else if (char === quote) {
      quote = null
    }

    if (char === ',' && quote === null) {
      result.push(current.trim())
      current = ''
    } else {
      current += char
    }
  }

  if (current.trim()) result.push(current.trim())
  return result
}

function stripInlineComment(value: string): string {
  let quote: '"' | "'" | null = null
  for (let i = 0; i < value.length; i += 1) {
    const char = value[i]
    if ((char === '"' || char === "'") && quote === null) quote = char
    else if (char === quote) quote = null
    else if (char === '#' && quote === null && /\s/.test(value[i - 1] ?? ' ')) {
      return value.slice(0, i)
    }
  }
  return value
}

function isQuoted(value: string): boolean {
  return (
    (value.startsWith('"') && value.endsWith('"')) ||
    (value.startsWith("'") && value.endsWith("'"))
  )
}

function frontmatterString(frontmatter: Record<string, unknown> | null, key: string): string | undefined {
  const value = frontmatter?.[key]
  return typeof value === 'string' && value.trim() ? value.trim() : undefined
}

function frontmatterStringList(frontmatter: Record<string, unknown> | null, key: string): string[] {
  const value = frontmatter?.[key]
  if (Array.isArray(value)) return value.flatMap(valueToStringList)
  return valueToStringList(value)
}

function valueToStringList(value: unknown): string[] {
  if (typeof value !== 'string') return []
  return value
    .split(',')
    .map((item) => normalizeTagOrText(item))
    .filter(Boolean)
}

function normalizeTagOrText(value: string): string {
  return value.trim().replace(/^#/, '')
}

function isPublished(frontmatter: Record<string, unknown> | null): boolean {
  return !isFalseLike(frontmatter?.publish) && !isTrueLike(frontmatter?.draft)
}

function isFalseLike(value: unknown): boolean {
  return value === false || (typeof value === 'string' && value.toLowerCase() === 'false')
}

function isTrueLike(value: unknown): boolean {
  return value === true || (typeof value === 'string' && value.toLowerCase() === 'true')
}

function extractHeadings(content: string): NoteHeading[] {
  const headings: NoteHeading[] = []
  const slugCounts = new Map<string, number>()
  let inFence = false

  for (const line of content.replace(/\r\n/g, '\n').split('\n')) {
    if (/^```|^~~~/.test(line.trim())) {
      inFence = !inFence
      continue
    }
    if (inFence) continue

    const match = /^(#{1,6})\s+(.+?)\s*#*\s*$/.exec(line)
    if (!match) continue

    const text = stripMarkdown(match[2]).trim()
    const baseSlug = slugify(text)
    const count = slugCounts.get(baseSlug) ?? 0
    slugCounts.set(baseSlug, count + 1)

    headings.push({
      level: match[1].length,
      text,
      slug: count === 0 ? baseSlug : `${baseSlug}-${count}`,
    })
  }

  return headings
}

function extractBlockReferences(content: string): BlockReference[] {
  const blocks: BlockReference[] = []
  const seen = new Set<string>()

  for (const line of content.replace(/\r\n/g, '\n').split('\n')) {
    const match = /(?:^|\s)\^([A-Za-z0-9-]+)\s*$/.exec(line)
    if (!match || seen.has(match[1])) continue
    seen.add(match[1])
    blocks.push({ id: match[1], slug: `block-${match[1]}` })
  }

  return blocks
}

function extractInlineTags(content: string): string[] {
  const masked = maskCode(content)
  const tags: string[] = []
  const regex = /(^|[\s({])#([A-Za-z0-9_/-]+)/g
  let match: RegExpExecArray | null
  while ((match = regex.exec(masked))) {
    tags.push(match[2])
  }
  return uniqueStrings(tags)
}

function extractLinks(content: string, sourcePath: string): VaultLink[] {
  const masked = maskCode(content)
  const links: VaultLink[] = []
  let counter = 0

  const wikilinkRegex = /(!?)\[\[([^\]\n]+)\]\]/g
  let wikiMatch: RegExpExecArray | null
  while ((wikiMatch = wikilinkRegex.exec(masked))) {
    const parsed = parseWikilinkTarget(wikiMatch[2])
    links.push({
      id: `${sourcePath}:${counter++}`,
      syntax: 'wikilink',
      sourcePath,
      raw: wikiMatch[0],
      rawTarget: parsed.target,
      display: parsed.display,
      embed: wikiMatch[1] === '!',
      resolved: false,
    })
  }

  const markdownLinkRegex = /(!?)\[([^\]\n]*)\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g
  let markdownMatch: RegExpExecArray | null
  while ((markdownMatch = markdownLinkRegex.exec(masked))) {
    const rawTarget = markdownMatch[3].trim()
    if (isExternalTarget(rawTarget)) continue
    links.push({
      id: `${sourcePath}:${counter++}`,
      syntax: 'markdown',
      sourcePath,
      raw: markdownMatch[0],
      rawTarget,
      display: markdownMatch[2],
      embed: markdownMatch[1] === '!',
      resolved: false,
    })
  }

  return links
}

function parseWikilinkTarget(value: string): { target: string; display?: string } {
  const pipeIndex = value.indexOf('|')
  if (pipeIndex === -1) return { target: value.trim() }
  return {
    target: value.slice(0, pipeIndex).trim(),
    display: value.slice(pipeIndex + 1).trim(),
  }
}

function resolveVaultLink(link: VaultLink, context: ResolveContext): VaultLink {
  const target = splitTarget(link.rawTarget)
  const noteResolution = resolvePath(target.pathPart, link.sourcePath, context.notesByPath, context.notesByBase, true)
    ?? resolveAlias(target.pathPart, context.aliases)
    ?? resolveLooseNoteTarget(target.pathPart, context)

  if (noteResolution) {
    if (noteResolution.reason) {
      return { ...link, ...noteResolution, resolved: false }
    }

    const note = context.notesByPath.get(noteResolution.targetPath)
    const anchor = resolveNoteAnchor(note, target.fragment)
    return {
      ...link,
      resolved: true,
      targetType: 'note',
      targetPath: noteResolution.targetPath,
      anchor: anchor.anchor,
      blockId: anchor.blockId,
    }
  }

  const attachmentResolution = resolvePath(
    target.pathPart,
    link.sourcePath,
    context.attachmentsByPath,
    context.attachmentsByBase,
    false,
  )

  if (attachmentResolution) {
    if (attachmentResolution.reason) {
      return { ...link, ...attachmentResolution, resolved: false }
    }
    return {
      ...link,
      resolved: true,
      targetType: 'attachment',
      targetPath: attachmentResolution.targetPath,
    }
  }

  return { ...link, resolved: false, reason: 'not_found' }
}

function createResolveContext(notes: VaultNote[], attachments: AttachmentMeta[]): ResolveContext {
  const notesByPath = new Map<string, VaultNote>()
  const attachmentsByPath = new Map<string, AttachmentMeta>()
  const notesByBase = new Map<string, string[]>()
  const attachmentsByBase = new Map<string, string[]>()
  const aliases = new Map<string, string[]>()

  for (const note of notes) {
    notesByPath.set(note.path, note)
    pushMap(notesByBase, basenameWithoutExt(note.path).toLowerCase(), note.path)
    for (const alias of noteLookupLabels(note)) {
      pushMap(aliases, lookupKey(alias), note.path)
    }
  }

  for (const attachment of attachments) {
    attachmentsByPath.set(attachment.path, attachment)
    pushMap(attachmentsByBase, basename(attachment.path).toLowerCase(), attachment.path)
  }

  return { notes, notesByPath, attachmentsByPath, notesByBase, attachmentsByBase, aliases }
}

function resolvePath<T>(
  rawPath: string,
  sourcePath: string,
  byPath: Map<string, T>,
  byBase: Map<string, string[]>,
  allowMdExtension: boolean,
): { targetPath: string; reason?: undefined } | { reason: 'ambiguous'; candidates: string[] } | undefined {
  const normalized = normalizeVaultPath(rawPath)
  if (normalized === null) return undefined
  if (normalized === '' && byPath.has(sourcePath)) return { targetPath: sourcePath }

  const exactCandidates = candidatesForPath(normalized, allowMdExtension)
  for (const candidate of exactCandidates) {
    if (byPath.has(candidate)) return { targetPath: candidate }
  }

  const relativePath = joinVaultPath(dirname(sourcePath), normalized)
  if (relativePath !== normalized) {
    for (const candidate of candidatesForPath(relativePath, allowMdExtension)) {
      if (byPath.has(candidate)) return { targetPath: candidate }
    }
  }

  if (!normalized.includes('/')) {
    const baseCandidates = byBase.get(stripMarkdownExtension(normalized).toLowerCase()) ?? []
    if (baseCandidates.length === 1) return { targetPath: baseCandidates[0] }
    if (baseCandidates.length > 1) return { reason: 'ambiguous', candidates: baseCandidates }
  }

  return undefined
}

function resolveAlias(rawPath: string, aliases: Map<string, string[]>): { targetPath: string; reason?: undefined } | { reason: 'ambiguous'; candidates: string[] } | undefined {
  const key = lookupKey(normalizePermalink(stripMarkdownExtension(rawPath)) ?? '')
  if (!key) return undefined
  const candidates = aliases.get(key) ?? []
  if (candidates.length === 1) return { targetPath: candidates[0] }
  if (candidates.length > 1) return { reason: 'ambiguous', candidates }
  return undefined
}

function resolveLooseNoteTarget(rawPath: string, context: ResolveContext): { targetPath: string; reason?: undefined } | { reason: 'ambiguous'; candidates: string[] } | undefined {
  const normalized = normalizeVaultPath(rawPath)
  if (!normalized) return undefined

  const targetSegment = stripMarkdownExtension(basename(normalized))
  const targetKey = lookupKey(targetSegment)
  if (!targetKey) return undefined

  const matches = new Set<string>()
  for (const note of context.notes) {
    const labels = noteLookupLabels(note).map(lookupKey).filter(Boolean)
    if (labels.some((label) => label.includes(targetKey) || targetKey.includes(label))) {
      matches.add(note.path)
    }
  }

  const candidates = Array.from(matches)
  if (candidates.length === 1) return { targetPath: candidates[0] }
  if (candidates.length > 1) return { reason: 'ambiguous', candidates }
  return undefined
}

function noteLookupLabels(note: VaultNote): string[] {
  return [
    note.title,
    ...note.aliases,
    note.permalink ?? '',
    stripMarkdownExtension(note.name),
    basenameWithoutExt(note.path),
  ].filter(Boolean)
}

function resolveNoteAnchor(note: VaultNote | undefined, fragment?: string): { anchor?: string; blockId?: string } {
  if (!fragment) return {}
  const decoded = safeDecodeURIComponent(fragment)
  if (decoded.startsWith('^')) {
    const blockId = decoded.slice(1)
    const block = note?.blocks.find((item) => item.id === blockId)
    return { anchor: block?.slug ?? `block-${blockId}`, blockId }
  }

  const normalized = decoded.toLowerCase()
  const heading = note?.headings.find((item) =>
    item.text.toLowerCase() === normalized || item.slug === slugify(decoded),
  )
  return { anchor: heading?.slug ?? slugify(decoded) }
}

function splitTarget(rawTarget: string): { pathPart: string; fragment?: string } {
  const hashIndex = rawTarget.indexOf('#')
  if (hashIndex === -1) return { pathPart: rawTarget.trim() }
  return {
    pathPart: rawTarget.slice(0, hashIndex).trim(),
    fragment: rawTarget.slice(hashIndex + 1).trim(),
  }
}

function candidatesForPath(path: string, allowMdExtension: boolean): string[] {
  if (!allowMdExtension || isMarkdownPath(path)) return [path]
  return [path, `${path}.md`]
}

function buildTagIndex(notes: VaultNote[]): VaultIndex['tags'] {
  const tagMap = new Map<string, Set<string>>()
  for (const note of notes) {
    for (const tag of note.tags) {
      if (!tagMap.has(tag)) tagMap.set(tag, new Set())
      tagMap.get(tag)?.add(note.path)
    }
  }

  return Array.from(tagMap.entries())
    .map(([tag, paths]) => ({ tag, count: paths.size, notes: Array.from(paths).sort() }))
    .sort((a, b) => a.tag.localeCompare(b.tag))
}

function buildAliasRecord(notes: VaultNote[]): Record<string, string[]> {
  const aliases: Record<string, string[]> = {}
  for (const note of notes) {
    for (const alias of note.aliases) {
      const key = alias.toLowerCase()
      aliases[key] ??= []
      aliases[key].push(note.path)
    }
  }
  return aliases
}

function sortTree(nodes: TreeNode[]) {
  nodes.sort((a, b) => {
    if (a.type !== b.type) return a.type === 'dir' ? -1 : 1
    return a.name.localeCompare(b.name)
  })

  for (const node of nodes) {
    if (node.type === 'dir') sortTree(node.children)
  }
}

function pushMap(map: Map<string, string[]>, key: string, value: string) {
  if (!key) return
  const values = map.get(key) ?? []
  values.push(value)
  map.set(key, values)
}

function maskCode(content: string): string {
  const lines = content.replace(/\r\n/g, '\n').split('\n')
  let inFence = false
  return lines
    .map((line) => {
      if (/^\s*(```|~~~)/.test(line)) {
        inFence = !inFence
        return ' '.repeat(line.length)
      }
      if (inFence) return ' '.repeat(line.length)
      return line.replace(/`[^`]*`/g, (match) => ' '.repeat(match.length))
    })
    .join('\n')
}

function isExternalTarget(target: string): boolean {
  return /^(?:[a-z][a-z0-9+.-]*:|\/\/)/i.test(target)
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
}

function displayName(path: string): string {
  return stripMarkdownExtension(basename(path))
}

function basename(path: string): string {
  return path.split('/').pop() ?? path
}

function basenameWithoutExt(path: string): string {
  return stripMarkdownExtension(basename(path))
}

function dirname(path: string): string {
  const idx = path.lastIndexOf('/')
  return idx === -1 ? '' : path.slice(0, idx)
}

function joinVaultPath(base: string, target: string): string {
  if (!base) return target
  const joined = normalizeVaultPath(`${base}/${target}`)
  return joined ?? target
}

function getExtension(path: string): string {
  const name = basename(path)
  const idx = name.lastIndexOf('.')
  return idx === -1 ? '' : name.slice(idx).toLowerCase()
}

function stripMarkdownExtension(value: string): string {
  return value.replace(/\.md$/i, '')
}

function stripMarkdown(value: string): string {
  return value
    .replace(/!\[\[([^\]]+)\]\]/g, '$1')
    .replace(/\[\[([^\]|]+)(?:\|([^\]]+))?\]\]/g, (_match, target: string, display?: string) => display || target)
    .replace(/!\[([^\]]*)\]\([^)]+\)/g, '$1')
    .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
    .replace(/[`*_~]/g, '')
}

function slugify(value: string): string {
  const slug = stripMarkdown(value)
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s-]/gu, '')
    .replace(/\s+/g, '-')
  return slug || 'section'
}

function uniqueStrings(values: string[]): string[] {
  return Array.from(new Set(values.map(normalizeTagOrText).filter(Boolean))).sort()
}

function normalizePermalink(value: string | undefined): string | undefined {
  if (!value) return undefined
  const normalized = normalizeVaultPath(value.replace(/^\/+/, '').replace(/\/+$/, ''))
  return normalized || undefined
}

function lookupKey(value: string): string {
  return stripMarkdownExtension(value)
    .normalize('NFKC')
    .toLowerCase()
    .replace(/[\s\p{P}\p{S}_-]+/gu, '')
}

function safeDecodeURIComponent(value: string): string {
  try {
    return decodeURIComponent(value)
  } catch {
    return value
  }
}
