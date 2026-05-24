import { buildWebManifest, getSiteConfig, type SiteConfigEnv } from '../_shared/site-config.ts'

export const onRequestGet: PagesFunction<SiteConfigEnv> = async (context) => {
  const config = await getSiteConfig(context.env)
  return Response.json(buildWebManifest(config), {
    headers: {
      'Content-Type': 'application/manifest+json; charset=utf-8',
      'Cache-Control': 'public, max-age=300',
    },
  })
}
