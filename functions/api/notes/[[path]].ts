import { buildTreeFromIndex, findNoteByRequestPath, normalizeVaultPath } from '../../_shared/obsidian-core'
import { getVaultIndex } from '../../_shared/obsidian'

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

  if (normalizeVaultPath(notePath) === null) {
    return Response.json({ message: 'Invalid path', status: 400 }, { status: 400 })
  }

  return handleNote(context.env, notePath)
}

async function handleTree(env: Env) {
  try {
    const index = await getVaultIndex(env)
    return Response.json(buildTreeFromIndex(index))
  } catch (e) {
    return errorResponse(e)
  }
}

async function handleNote(env: Env, notePath: string) {
  try {
    const index = await getVaultIndex(env)
    const note = findNoteByRequestPath(index, notePath)
    if (!note) {
      return Response.json({ message: 'Note not found', status: 404 }, { status: 404 })
    }

    return Response.json({
      meta: {
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
      },
      frontmatter: note.frontmatter,
      content: note.content,
      html: note.content,
      links: note.outboundLinks,
      embeds: note.outboundLinks.filter((link) => link.embed),
      diagnostics: note.diagnostics,
    })
  } catch (e) {
    return errorResponse(e)
  }
}

function errorResponse(e: unknown): Response {
  const msg = e instanceof Error ? e.message : 'Unknown error'
  const status = msg === 'NOT_FOUND' ? 404 : 500
  return Response.json({ message: msg, status }, { status })
}
