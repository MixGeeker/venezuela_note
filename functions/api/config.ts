import { getFileContent, decodeBase64 } from '../_shared/github'

interface Env {
  GITHUB_TOKEN: string
  GITHUB_OWNER: string
  GITHUB_REPO: string
  NOTES_PATH: string
  NOTES_CACHE: KVNamespace
}

const DEFAULTS = { title: 'Notes', description: '' }

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const cached = await context.env.NOTES_CACHE.get('config:site', 'json')
  if (cached) return Response.json(cached)

  try {
    const file = await getFileContent(context.env, 'site.yml')
    const raw = decodeBase64(file.content)
    const config = parseSimpleYaml(raw)
    const merged = { ...DEFAULTS, ...config }
    await context.env.NOTES_CACHE.put('config:site', JSON.stringify(merged), { expirationTtl: 3600 })
    return Response.json(merged)
  } catch {
    await context.env.NOTES_CACHE.put('config:site', JSON.stringify(DEFAULTS), { expirationTtl: 3600 })
    return Response.json(DEFAULTS)
  }
}

function parseSimpleYaml(raw: string): Record<string, string> {
  const result: Record<string, string> = {}
  for (const line of raw.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue
    const idx = trimmed.indexOf(':')
    if (idx === -1) continue
    const key = trimmed.slice(0, idx).trim()
    const value = trimmed.slice(idx + 1).trim()
    result[key] = value
  }
  return result
}
