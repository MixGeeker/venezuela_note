import { decodeBase64, getFileContent } from './github.ts'
import { getMimeType, isHiddenOrPrivatePath, normalizeVaultPath } from './obsidian-core.ts'

export interface SiteConfigEnv {
  GITHUB_TOKEN: string
  GITHUB_OWNER: string
  GITHUB_REPO: string
  NOTES_PATH: string
  NOTES_CACHE: KVNamespace
}

export type SiteIconKind = 'favicon' | 'apple' | 'icon' | 'maskable'

export interface PublicSiteConfig {
  title: string
  shortName: string
  description: string
  themeColor: string
  backgroundColor: string
  lang: string
  iconUrl: string
  faviconUrl: string
  appleTouchIconUrl: string
  maskableIconUrl: string
}

export interface ResolvedSiteConfig extends PublicSiteConfig {
  iconPaths: Record<SiteIconKind, string | null>
  iconMimeTypes: Record<SiteIconKind, string>
}

export interface WebManifest {
  name: string
  short_name: string
  description: string
  start_url: string
  scope: string
  display: 'standalone'
  theme_color: string
  background_color: string
  lang: string
  icons: Array<{
    src: string
    sizes: string
    type: string
    purpose?: 'maskable'
  }>
}

export const SITE_CONFIG_CACHE_KEY = 'config:site:v3'
export const SITE_CONFIG_CACHE_TTL_SECONDS = 3600
export const SITE_ICON_KINDS = ['favicon', 'apple', 'icon', 'maskable'] as const

export const DEFAULT_STATIC_ICON_PATHS: Record<SiteIconKind, string> = {
  favicon: '/favicon.svg',
  apple: '/apple-touch-icon.png',
  icon: '/icons/pwa-512.png',
  maskable: '/icons/maskable-512.png',
}

export const DEFAULT_SITE_CONFIG: PublicSiteConfig = {
  title: 'Notes',
  shortName: 'Notes',
  description: '',
  themeColor: '#2563eb',
  backgroundColor: '#f9fafb',
  lang: 'zh-CN',
  iconUrl: siteIconUrl('icon'),
  faviconUrl: siteIconUrl('favicon'),
  appleTouchIconUrl: DEFAULT_STATIC_ICON_PATHS.apple,
  maskableIconUrl: siteIconUrl('maskable'),
}

export async function getSiteConfig(env: SiteConfigEnv): Promise<ResolvedSiteConfig> {
  const cached = await env.NOTES_CACHE.get<ResolvedSiteConfig>(SITE_CONFIG_CACHE_KEY, 'json')
  if (cached) return cached

  let config: ResolvedSiteConfig
  try {
    const file = await getFileContent(env, 'site.yml')
    config = resolveSiteConfig(decodeBase64(file.content))
  } catch {
    config = resolveSiteConfig('')
  }

  await env.NOTES_CACHE.put(SITE_CONFIG_CACHE_KEY, JSON.stringify(config), {
    expirationTtl: SITE_CONFIG_CACHE_TTL_SECONDS,
  })
  return config
}

export function publicSiteConfig(config: ResolvedSiteConfig): PublicSiteConfig {
  return {
    title: config.title,
    shortName: config.shortName,
    description: config.description,
    themeColor: config.themeColor,
    backgroundColor: config.backgroundColor,
    lang: config.lang,
    iconUrl: config.iconUrl,
    faviconUrl: config.faviconUrl,
    appleTouchIconUrl: config.appleTouchIconUrl,
    maskableIconUrl: config.maskableIconUrl,
  }
}

export function resolveSiteConfig(raw: string | Record<string, string>): ResolvedSiteConfig {
  const values = typeof raw === 'string' ? parseSimpleYaml(raw) : raw
  const title = nonEmptyString(values.title) ?? DEFAULT_SITE_CONFIG.title
  const shortName =
    nonEmptyString(values.short_name) ??
    nonEmptyString(values.shortName) ??
    title

  const iconPaths = resolveIconPaths(values)
  const iconMimeTypes = resolveIconMimeTypes(iconPaths)

  return {
    title,
    shortName,
    description: stringValue(values.description) ?? DEFAULT_SITE_CONFIG.description,
    themeColor: colorValue(values.theme_color ?? values.themeColor) ?? DEFAULT_SITE_CONFIG.themeColor,
    backgroundColor:
      colorValue(values.background_color ?? values.backgroundColor) ??
      DEFAULT_SITE_CONFIG.backgroundColor,
    lang: langValue(values.lang) ?? DEFAULT_SITE_CONFIG.lang,
    iconUrl: siteIconUrl('icon'),
    faviconUrl: siteIconUrl('favicon'),
    appleTouchIconUrl: siteIconUrl('apple'),
    maskableIconUrl: siteIconUrl('maskable'),
    iconPaths,
    iconMimeTypes,
  }
}

export function parseSimpleYaml(raw: string): Record<string, string> {
  const result: Record<string, string> = {}
  for (const line of raw.split('\n')) {
    const trimmed = line.trim()
    if (!trimmed || trimmed.startsWith('#')) continue

    const idx = trimmed.indexOf(':')
    if (idx === -1) continue

    const key = trimmed.slice(0, idx).trim()
    const value = trimmed.slice(idx + 1).trim()
    if (key) result[key] = unquote(value)
  }
  return result
}

export function buildWebManifest(config: ResolvedSiteConfig): WebManifest {
  return {
    name: config.title,
    short_name: config.shortName,
    description: config.description,
    start_url: '/',
    scope: '/',
    display: 'standalone',
    theme_color: config.themeColor,
    background_color: config.backgroundColor,
    lang: config.lang,
    icons: [
      manifestIcon(config, 'icon', '192x192'),
      manifestIcon(config, 'icon', '512x512'),
      manifestIcon(config, 'maskable', '512x512', 'maskable'),
    ],
  }
}

export function resolveSiteIconPath(
  config: ResolvedSiteConfig,
  kind: SiteIconKind,
): string | null {
  return config.iconPaths[kind]
}

export function isSiteIconKind(value: string | null): value is SiteIconKind {
  return value !== null && (SITE_ICON_KINDS as readonly string[]).includes(value)
}

export function siteIconUrl(kind: SiteIconKind): string {
  if (kind === 'apple') return DEFAULT_STATIC_ICON_PATHS.apple
  return `/api/site-icon?kind=${kind}`
}

function manifestIcon(
  config: ResolvedSiteConfig,
  kind: SiteIconKind,
  sizes: string,
  purpose?: 'maskable',
): WebManifest['icons'][number] {
  const mimeType = config.iconMimeTypes[kind]
  const icon = {
    src: siteIconUrl(kind),
    sizes: mimeType === 'image/svg+xml' ? 'any' : sizes,
    type: mimeType,
  }
  return purpose ? { ...icon, purpose } : icon
}

function resolveIconPaths(values: Record<string, string>): Record<SiteIconKind, string | null> {
  const icon = imagePath(values.icon)
  return {
    favicon: imagePath(values.favicon) ?? icon,
    apple:
      appleTouchIconPath(values.apple_touch_icon ?? values.appleTouchIcon) ??
      appleTouchIconPath(values.icon),
    icon,
    maskable: imagePath(values.maskable_icon ?? values.maskableIcon) ?? icon,
  }
}

function resolveIconMimeTypes(
  iconPaths: Record<SiteIconKind, string | null>,
): Record<SiteIconKind, string> {
  return {
    favicon: iconMimeType(iconPaths.favicon, 'favicon'),
    apple: iconMimeType(iconPaths.apple, 'apple'),
    icon: iconMimeType(iconPaths.icon, 'icon'),
    maskable: iconMimeType(iconPaths.maskable, 'maskable'),
  }
}

function iconMimeType(path: string | null, kind: SiteIconKind): string {
  return path ? getMimeType(path) : getMimeType(DEFAULT_STATIC_ICON_PATHS[kind])
}

function imagePath(value: string | undefined): string | null {
  const path = nonEmptyString(value)
  if (!path) return null

  const normalized = normalizeVaultPath(path)
  if (!normalized || isHiddenOrPrivatePath(normalized)) return null

  const mimeType = getMimeType(normalized)
  if (!mimeType.startsWith('image/')) return null

  return normalized
}

function appleTouchIconPath(value: string | undefined): string | null {
  const path = imagePath(value)
  if (!path) return null

  return getMimeType(path) === 'image/png' ? path : null
}

function stringValue(value: string | undefined): string | undefined {
  return typeof value === 'string' ? value.trim() : undefined
}

function nonEmptyString(value: string | undefined): string | undefined {
  const trimmed = stringValue(value)
  return trimmed ? trimmed : undefined
}

function colorValue(value: string | undefined): string | undefined {
  const trimmed = nonEmptyString(value)
  if (!trimmed) return undefined
  return /^#(?:[0-9a-f]{3}|[0-9a-f]{6}|[0-9a-f]{8})$/i.test(trimmed) ? trimmed : undefined
}

function langValue(value: string | undefined): string | undefined {
  const trimmed = nonEmptyString(value)
  if (!trimmed) return undefined
  return /^[a-z]{2,3}(?:-[a-z0-9]{2,8})*$/i.test(trimmed) ? trimmed : undefined
}

function unquote(value: string): string {
  const trimmed = value.trim()
  if (trimmed.length < 2) return trimmed

  const quote = trimmed[0]
  if ((quote === '"' || quote === "'") && trimmed.endsWith(quote)) {
    return trimmed.slice(1, -1)
  }
  return trimmed
}
