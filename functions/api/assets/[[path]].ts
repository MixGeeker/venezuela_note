import { decodeBase64Bytes, getFileContent } from '../../_shared/github'
import { getMimeType, isHiddenOrPrivatePath, normalizeVaultPath } from '../../_shared/obsidian-core'
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
  const requestPath = segments ? segments.join('/') : ''
  const assetPath = normalizeVaultPath(requestPath)

  if (!assetPath || isHiddenOrPrivatePath(assetPath)) {
    return Response.json({ message: 'Asset not found', status: 404 }, { status: 404 })
  }

  try {
    const index = await getVaultIndex(context.env)
    const attachment = index.attachments.find((item) => item.path === assetPath)
    if (!attachment) {
      return Response.json({ message: 'Asset not found', status: 404 }, { status: 404 })
    }

    const file = await getFileContent(context.env, attachment.path)
    const bytes = decodeBase64Bytes(file.content)
    const body = new ArrayBuffer(bytes.byteLength)
    new Uint8Array(body).set(bytes)
    return new Response(body, {
      headers: {
        'Content-Type': attachment.mimeType || getMimeType(assetPath),
        'Cache-Control': 'public, max-age=300',
        'Content-Disposition': `inline; filename="${encodeURIComponent(attachment.name)}"`,
      },
    })
  } catch (e) {
    const msg = e instanceof Error ? e.message : 'Failed to load asset'
    const status = msg === 'NOT_FOUND' ? 404 : 500
    return Response.json({ message: msg, status }, { status })
  }
}
