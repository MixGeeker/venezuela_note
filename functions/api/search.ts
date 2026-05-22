import { getVaultIndex } from '../_shared/obsidian'

interface Env {
  GITHUB_TOKEN: string
  GITHUB_OWNER: string
  GITHUB_REPO: string
  NOTES_PATH: string
  NOTES_CACHE: KVNamespace
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const url = new URL(context.request.url)
  const query = (url.searchParams.get('q') ?? '').trim()
  const tag = normalizeTag(url.searchParams.get('tag') ?? '')

  if (!query && !tag) {
    return Response.json(
      { message: 'Query parameter "q" or "tag" is required', status: 400 },
      { status: 400 },
    )
  }

  try {
    const index = await getVaultIndex(context.env)
    const loweredQuery = query.toLowerCase()

    const results = index.notes
      .filter((note) => {
        if (tag) return note.tags.includes(tag)
        const haystack = [
          note.title,
          note.path,
          ...note.aliases,
          ...note.tags,
          note.content,
        ].join('\n').toLowerCase()
        return haystack.includes(loweredQuery)
      })
      .map((note) => ({
        name: note.name,
        path: note.path,
        title: note.title,
        tags: note.tags,
        textMatches: [{ fragment: tag ? `#${tag}` : makeFragment(note.content, query) }],
      }))

    return Response.json(results)
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Search failed'
    return Response.json({ message: msg, status: 500 }, { status: 500 })
  }
}

function normalizeTag(value: string): string {
  return value.trim().replace(/^#/, '')
}

function makeFragment(content: string, query: string): string {
  const normalized = content.replace(/\s+/g, ' ').trim()
  const idx = normalized.toLowerCase().indexOf(query.toLowerCase())
  if (idx === -1) return normalized.slice(0, 180)

  const start = Math.max(0, idx - 80)
  const end = Math.min(normalized.length, idx + query.length + 100)
  return normalized.slice(start, end)
}
