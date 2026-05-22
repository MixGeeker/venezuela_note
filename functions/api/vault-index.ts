import { publicVaultIndex } from '../_shared/obsidian-core'
import { getVaultIndex } from '../_shared/obsidian'

interface Env {
  GITHUB_TOKEN: string
  GITHUB_OWNER: string
  GITHUB_REPO: string
  NOTES_PATH: string
  NOTES_CACHE: KVNamespace
}

export const onRequestGet: PagesFunction<Env> = async (context) => {
  try {
    const index = await getVaultIndex(context.env)
    return Response.json(publicVaultIndex(index))
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Failed to load vault index'
    return Response.json({ message: msg, status: 500 }, { status: 500 })
  }
}
