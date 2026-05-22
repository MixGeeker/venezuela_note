import { listDirectory } from '../../_shared/github'

interface Env {
  GITHUB_TOKEN: string
  GITHUB_OWNER: string
  GITHUB_REPO: string
  NOTES_CACHE: KVNamespace
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const { NOTES_CACHE } = context.env
  const cacheKey = 'notes:tree'

  const cached = await NOTES_CACHE.get(cacheKey, 'json')
  if (cached) return Response.json(cached)

  try {
    const tree = await fetchTreeRecursive(context.env, '')
    await NOTES_CACHE.put(cacheKey, JSON.stringify(tree), { expirationTtl: 300 })
    return Response.json(tree)
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
    const relativePath = item.path.replace(/^notes\//, '')
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

interface TreeNode {
  name: string
  path: string
  type: 'file' | 'dir'
  sha?: string
  size?: number
  children?: TreeNode[]
}
