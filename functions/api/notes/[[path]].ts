import { getFileContent, decodeBase64 } from '../../_shared/github'
import { parseFrontmatter, renderMarkdown } from '../../../src/utils/markdown'

interface Env {
  GITHUB_TOKEN: string
  GITHUB_OWNER: string
  GITHUB_REPO: string
  NOTES_CACHE: KVNamespace
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const segments = context.params.path as string[] | undefined
  const notePath = segments ? segments.join('/') : ''

  if (!notePath) {
    return Response.json({ message: 'Path is required', status: 400 }, { status: 400 })
  }

  if (notePath.includes('..')) {
    return Response.json({ message: 'Invalid path', status: 400 }, { status: 400 })
  }

  const cacheKey = `notes:content:${notePath}`
  const cached = await context.env.NOTES_CACHE.get(cacheKey, 'json')
  if (cached) return Response.json(cached)

  try {
    const file = await getFileContent(context.env, notePath)
    const raw = decodeBase64(file.content)
    const { frontmatter, content } = parseFrontmatter(raw)
    const html = renderMarkdown(content)

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
      html,
    }

    await context.env.NOTES_CACHE.put(cacheKey, JSON.stringify(result), { expirationTtl: 300 })
    return Response.json(result)
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Unknown error'
    const status = msg === 'NOT_FOUND' ? 404 : 500
    return Response.json({ message: msg, status }, { status })
  }
}
