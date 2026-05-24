import { watch, type Ref } from 'vue'
import type { SiteConfig } from '@/types'

export function useSiteHead(siteConfig: Ref<SiteConfig>) {
  watch(siteConfig, applySiteHead, { immediate: true, deep: true })
}

export function applySiteHead(config: SiteConfig) {
  document.title = config.title
  document.documentElement.lang = config.lang || 'zh-CN'
  setMeta('description', config.description ?? '')
  setMeta('theme-color', config.themeColor)
  setLink('icon', config.faviconUrl)
  setLink('apple-touch-icon', config.appleTouchIconUrl)
}

function setMeta(name: string, content: string) {
  let meta = document.querySelector<HTMLMetaElement>(`meta[name="${name}"]`)
  if (!meta) {
    meta = document.createElement('meta')
    meta.name = name
    document.head.appendChild(meta)
  }
  meta.content = content
}

function setLink(rel: string, href: string) {
  let link = document.querySelector<HTMLLinkElement>(`link[rel="${rel}"]`)
  if (!link) {
    link = document.createElement('link')
    link.rel = rel
    document.head.appendChild(link)
  }
  link.href = href
}
