import { decodeBase64Bytes, getFileContent } from '../_shared/github.ts'
import { getMimeType } from '../_shared/obsidian-core.ts'
import {
  DEFAULT_STATIC_ICON_PATHS,
  getSiteConfig,
  isSiteIconKind,
  resolveSiteIconPath,
  type SiteConfigEnv,
} from '../_shared/site-config.ts'

export const onRequestGet: PagesFunction<SiteConfigEnv> = async (context) => {
  const url = new URL(context.request.url)
  const kind = url.searchParams.get('kind')

  if (!isSiteIconKind(kind)) {
    return Response.json({ message: 'Invalid icon kind', status: 400 }, { status: 400 })
  }

  const config = await getSiteConfig(context.env)
  const iconPath = resolveSiteIconPath(config, kind)
  if (!iconPath) return fallbackIcon(context.request, kind)

  try {
    const file = await getFileContent(context.env, iconPath)
    const bytes = decodeBase64Bytes(file.content)
    const body = new ArrayBuffer(bytes.byteLength)
    new Uint8Array(body).set(bytes)

    return new Response(body, {
      headers: {
        'Content-Type': getMimeType(iconPath),
        'Cache-Control': 'public, max-age=300',
        'Content-Disposition': `inline; filename="${encodeURIComponent(file.name)}"`,
      },
    })
  } catch {
    return fallbackIcon(context.request, kind)
  }
}

function fallbackIcon(request: Request, kind: keyof typeof DEFAULT_STATIC_ICON_PATHS): Response {
  return Response.redirect(new URL(DEFAULT_STATIC_ICON_PATHS[kind], request.url).toString(), 302)
}
