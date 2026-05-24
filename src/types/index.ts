export interface NoteMeta {
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

export interface NoteDir {
  name: string
  path: string
  type: 'dir'
  children: TreeNode[]
}

export type TreeNode = NoteMeta | NoteDir

export interface NoteContent {
  meta: NoteMeta
  frontmatter: Record<string, unknown> | null
  content: string
  html: string
  links: VaultLink[]
  embeds: VaultLink[]
  diagnostics: LinkDiagnostic[]
}

export interface SearchResult {
  name: string
  path: string
  title?: string
  tags?: string[]
  textMatches: Array<{
    fragment: string
  }>
}

export interface NoteHeading {
  level: number
  text: string
  slug: string
}

export interface VaultLink {
  id: string
  syntax: 'wikilink' | 'markdown'
  sourcePath: string
  raw: string
  rawTarget: string
  display?: string
  embed: boolean
  resolved: boolean
  targetType?: 'note' | 'attachment'
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

export interface AttachmentMeta {
  name: string
  path: string
  type: 'file'
  sha: string
  size: number
  mimeType: string
}

export interface VaultIndex {
  notes: Array<NoteMeta & { diagnostics: LinkDiagnostic[] }>
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

export interface ApiError {
  message: string
  status: number
}

export interface SiteConfig {
  title: string
  shortName: string
  description: string
  themeColor: string
  backgroundColor: string
  lang: string
  iconUrl: string
  faviconUrl: string
  appleTouchIconUrl: string
  maskableIconUrl: string
}

export interface Env {
  GITHUB_TOKEN: string
  GITHUB_OWNER: string
  GITHUB_REPO: string
  NOTES_PATH: string
  NOTES_CACHE: KVNamespace
}
