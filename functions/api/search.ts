import { searchCode } from '../_shared/github'

interface Env {
  GITHUB_TOKEN: string
  GITHUB_OWNER: string
  GITHUB_REPO: string
  NOTES_CACHE: KVNamespace
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  const url = new URL(context.request.url)
  const query = url.searchParams.get('q')

  if (!query) {
    return Response.json({ message: 'Query parameter "q" is required', status: 400 }, { status: 400 })
  }

  const cacheKey = `search:${query}`
  const cached = await context.env.NOTES_CACHE.get(cacheKey, 'json')
  if (cached) return Response.json(cached)

  try {
    const ghResult = await searchCode(context.env, query)

    const results = ghResult.items.map(item => ({
      name: item.name,
      path: item.path.replace(/^notes\//, ''),
      textMatches: (item.text_matches ?? []).map(m => ({ fragment: m.fragment })),
    }))

    await context.env.NOTES_CACHE.put(cacheKey, JSON.stringify(results), { expirationTtl: 120 })
    return Response.json(results)
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Search failed'
    return Response.json({ message: msg, status: 500 }, { status: 500 })
  }
}
