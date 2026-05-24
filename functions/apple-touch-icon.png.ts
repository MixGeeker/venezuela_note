import { decodeBase64Bytes, getFileContent } from './_shared/github.ts'
import {
  getSiteConfig,
  resolveSiteIconPath,
  type SiteConfigEnv,
} from './_shared/site-config.ts'

interface AppleTouchIconEnv extends SiteConfigEnv {
  ASSETS: Fetcher
}

export const onRequestGet: PagesFunction<AppleTouchIconEnv> = async (context) => {
  const config = await getSiteConfig(context.env)
  const iconPath = resolveSiteIconPath(config, 'apple')
  if (!iconPath) return bundledAppleTouchIcon(context)

  try {
    const file = await getFileContent(context.env, iconPath)
    const bytes = decodeBase64Bytes(file.content)
    const body = new ArrayBuffer(bytes.byteLength)
    new Uint8Array(body).set(bytes)

    return new Response(body, {
      headers: {
        'Content-Type': 'image/png',
        'Cache-Control': 'public, max-age=300',
        'Content-Disposition': `inline; filename="${encodeURIComponent(file.name)}"`,
      },
    })
  } catch {
    return bundledAppleTouchIcon(context)
  }
}

function bundledAppleTouchIcon(context: EventContext<AppleTouchIconEnv, string, unknown>) {
  return context.env.ASSETS.fetch(context.request)
}
