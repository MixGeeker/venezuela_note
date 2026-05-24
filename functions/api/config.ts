import {
  getSiteConfig,
  publicSiteConfig,
  type SiteConfigEnv,
} from '../_shared/site-config.ts'

export const onRequestGet: PagesFunction<SiteConfigEnv> = async (context) => {
  const config = await getSiteConfig(context.env)
  return Response.json(publicSiteConfig(config))
}
