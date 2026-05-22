import { listDirectory, getFileContent, decodeBase64 } from '../../_shared/github'

interface Env {
  GITHUB_TOKEN: string
  GITHUB_OWNER: string
  GITHUB_REPO: string
  NOTES_PATH: string
  NOTES_CACHE: KVNamespace
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const segments = context.params.path as string[] | undefined
  const notePath = segments ? segments.join('/') : ''

  if (!notePath) {
    return handleTree(context.env)
  }

  if (notePath.includes('..')) {
    return Response.json({ message: 'Invalid path', status: 400 }, { status: 400 })
  }

  return handleNote(context.env, notePath)
}

async function handleTree(env: Env) {
  const cached = await env.NOTES_CACHE.get('notes:tree', 'json')
  if (cached) return Response.json(cached)

  try {
    const tree = await fetchTreeRecursive(env, '')
    await env.NOTES_CACHE.put('notes:tree', JSON.stringify(tree), { expirationTtl: 300 })
    return Response.json(tree)
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown error'
    const status = msg === 'NOT_FOUND' ? 404 : 500
    return Response.json({ message: msg, status }, { status })
  }
}

async function handleNote(env: Env, notePath: string) {
  const cacheKey = `notes:content:${notePath}`
  const cached = await env.NOTES_CACHE.get(cacheKey, 'json')
  if (cached) return Response.json(cached)

  try {
    const file = await getFileContent(env, notePath)
    const raw = decodeBase64(file.content)
    const { frontmatter, content } = parseFrontmatter(raw)

    const result = {
      meta: {
        name: file.name,
        path: notePath,
        type: 'file' as const,
        sha: file.sha,
        size: file.size,
      },
      frontmatter,
      content,
      html: content,
    }

    await env.NOTES_CACHE.put(cacheKey, JSON.stringify(result), { expirationTtl: 300 })
    return Response.json(result)
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown error'
    const status = msg === 'NOT_FOUND' ? 404 : 500
    return Response.json({ message: msg, status }, { status })
  }
}

async function fetchTreeRecursive(env: Env, dirPath: string): Promise<TreeNode[]> {
  const items = await listDirectory(env, dirPath)
  const result: TreeNode[] = []

  for (const item of items) {
    const relativePath = env.NOTES_PATH
      ? item.path.replace(new RegExp(`^${escapeRegex(env.NOTES_PATH)}/?`), '')
      : item.path
    if (item.type === 'dir') {
      const children = await fetchTreeRecursive(env, relativePath)
      result.push({
        name: item.name,
        path: relativePath,
        type: 'dir',
        children,
      })
    } else if (item.name.endsWith('.md')) {
      result.push({
        name: item.name,
        path: relativePath,
        type: 'file',
        sha: item.sha,
        size: item.size,
      })
    }
  }

  return result
}

function parseFrontmatter(raw: string) {
  const match = raw.match(/^---\r?\n([\s\S]*?)\r?\n---\r?\n?/)
  if (!match) return { frontmatter: null, raw }

  const yaml = match[1]
  const frontmatter: Record<string, string | string[]> = {}
  for (const line of yaml.split('\n')) {
    const idx = line.indexOf(':')
    if (idx === -1) continue
    const key = line.slice(0, idx).trim()
    const value = line.slice(idx + 1).trim()
    if (value.startsWith('[') && value.endsWith(']')) {
      frontmatter[key] = value.slice(1, -1).split(',').map(s => s.trim())
    } else {
      frontmatter[key] = value
    }
  }

  return { frontmatter, content: raw.slice(match[0].length) }
}

function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}

interface TreeNode {
  name: string
  path: string
  type: 'file' | 'dir'
  sha?: string
  size?: number
  children?: TreeNode[]
}
