export interface NoteMeta {
  name: string
  path: string
  type: 'file'
  sha: string
  size: number
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
}

export interface SearchResult {
  name: string
  path: string
  textMatches: Array<{
    fragment: string
  }>
}

export interface ApiError {
  message: string
  status: number
}

export interface SiteConfig {
  title: string
  description?: string
}

export interface Env {
  GITHUB_TOKEN: string
  GITHUB_OWNER: string
  GITHUB_REPO: string
  NOTES_PATH: string
  NOTES_CACHE: KVNamespace
}
