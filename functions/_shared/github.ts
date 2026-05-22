type Env = {
  GITHUB_TOKEN: string
  GITHUB_OWNER: string
  GITHUB_REPO: string
  NOTES_PATH: string
}

const GITHUB_API = 'https://api.github.com'

function headers(env: Env): HeadersInit {
  return {
    Authorization: `Bearer ${env.GITHUB_TOKEN}`,
    Accept: 'application/vnd.github.v3+json',
  }
}

export async function listDirectory(env: Env, path: string): Promise<GhContent[]> {
  const url = `${GITHUB_API}/repos/${env.GITHUB_OWNER}/${env.GITHUB_REPO}/contents/${env.NOTES_PATH}/${path}`
  const res = await fetch(url, { headers: headers(env) })
  if (!res.ok) {
    if (res.status === 404) throw new Error('NOT_FOUND')
    throw new Error(`GitHub API error: ${res.status}`)
  }
  const data = await res.json()
  return Array.isArray(data) ? data : [data]
}

export async function getFileContent(env: Env, path: string): Promise<GhFileContent> {
  const url = `${GITHUB_API}/repos/${env.GITHUB_OWNER}/${env.GITHUB_REPO}/contents/${env.NOTES_PATH}/${path}`
  const res = await fetch(url, { headers: headers(env) })
  if (!res.ok) {
    if (res.status === 404) throw new Error('NOT_FOUND')
    throw new Error(`GitHub API error: ${res.status}`)
  }
  return await res.json()
}

export async function searchCode(env: Env, query: string): Promise<GhSearchResult> {
  const q = `${query} repo:${env.GITHUB_OWNER}/${env.GITHUB_REPO} path:${env.NOTES_PATH}`
  const url = `${GITHUB_API}/search/code?q=${encodeURIComponent(q)}`
  const res = await fetch(url, { headers: headers(env) })
  if (!res.ok) throw new Error(`GitHub search error: ${res.status}`)
  return await res.json()
}

export function decodeBase64(data: string): string {
  return decodeURIComponent(
    atob(data.replace(/\n/g, ''))
      .split('')
      .map(c => '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2))
      .join(''),
  )
}

interface GhContent {
  name: string
  path: string
  type: 'file' | 'dir'
  sha: string
  size: number
}

interface GhFileContent extends GhContent {
  content: string
  encoding: string
}

interface GhSearchResult {
  total_count: number
  items: Array<{
    name: string
    path: string
    text_matches?: Array<{
      fragment: string
    }>
  }>
}
