import test from 'node:test'
import assert from 'node:assert/strict'
import {
  buildWebManifest,
  parseSimpleYaml,
  resolveSiteConfig,
  siteIconUrl,
} from '../functions/_shared/site-config.ts'

test('builds default site config', () => {
  const config = resolveSiteConfig('')

  assert.equal(config.title, 'Notes')
  assert.equal(config.shortName, 'Notes')
  assert.equal(config.description, '')
  assert.equal(config.themeColor, '#2563eb')
  assert.equal(config.backgroundColor, '#f9fafb')
  assert.equal(config.lang, 'zh-CN')
  assert.deepEqual(config.iconPaths, {
    favicon: null,
    apple: null,
    icon: null,
    maskable: null,
  })
  assert.equal(config.iconUrl, siteIconUrl('icon'))
  assert.equal(config.faviconUrl, siteIconUrl('favicon'))
  assert.equal(siteIconUrl('apple'), '/apple-touch-icon.png')
  assert.equal(config.appleTouchIconUrl, '/apple-touch-icon.png')
})

test('parses simple site yaml and normalizes brand fields', () => {
  const parsed = parseSimpleYaml(`
title: My Notes
short_name: MyApp
description: "Team knowledge base"
theme_color: "#123abc"
background_color: '#fafafa'
lang: en-US
icon: assets/app-icon.png
favicon: assets/favicon.ico
apple_touch_icon: assets/apple-touch-icon.png
maskable_icon: assets/maskable.svg
`)
  const config = resolveSiteConfig(parsed)

  assert.equal(config.title, 'My Notes')
  assert.equal(config.shortName, 'MyApp')
  assert.equal(config.description, 'Team knowledge base')
  assert.equal(config.themeColor, '#123abc')
  assert.equal(config.backgroundColor, '#fafafa')
  assert.equal(config.lang, 'en-US')
  assert.deepEqual(config.iconPaths, {
    favicon: 'assets/favicon.ico',
    apple: 'assets/apple-touch-icon.png',
    icon: 'assets/app-icon.png',
    maskable: 'assets/maskable.svg',
  })
})

test('uses png icon as the fallback for apple touch icon', () => {
  const config = resolveSiteConfig(`
title: Custom
icon: assets/app-icon.png
`)

  assert.equal(config.shortName, 'Custom')
  assert.deepEqual(config.iconPaths, {
    favicon: 'assets/app-icon.png',
    apple: 'assets/app-icon.png',
    icon: 'assets/app-icon.png',
    maskable: 'assets/app-icon.png',
  })
  assert.equal(config.appleTouchIconUrl, '/apple-touch-icon.png')
})

test('does not use non-png icon as the apple touch fallback', () => {
  const config = resolveSiteConfig(`
title: Custom
icon: assets/app-icon.webp
`)

  assert.equal(config.shortName, 'Custom')
  assert.deepEqual(config.iconPaths, {
    favicon: 'assets/app-icon.webp',
    apple: null,
    icon: 'assets/app-icon.webp',
    maskable: 'assets/app-icon.webp',
  })
  assert.equal(config.appleTouchIconUrl, '/apple-touch-icon.png')
})

test('ignores non-png apple touch icon paths', () => {
  const config = resolveSiteConfig(`
title: Custom
icon: assets/app-icon.svg
apple_touch_icon: assets/apple-touch-icon.svg
`)

  assert.deepEqual(config.iconPaths, {
    favicon: 'assets/app-icon.svg',
    apple: null,
    icon: 'assets/app-icon.svg',
    maskable: 'assets/app-icon.svg',
  })
  assert.equal(config.appleTouchIconUrl, '/apple-touch-icon.png')
})

test('rejects unsafe or non-image icon paths and invalid colors', () => {
  const config = resolveSiteConfig(`
title: Secure
theme_color: blue
background_color: "#ffffff"
lang: not_a_lang
icon: ../secret.png
favicon: .obsidian/favicon.svg
apple_touch_icon: docs/readme.md
maskable_icon: assets/icon.pdf
`)

  assert.deepEqual(config.iconPaths, {
    favicon: null,
    apple: null,
    icon: null,
    maskable: null,
  })
  assert.equal(config.themeColor, '#2563eb')
  assert.equal(config.backgroundColor, '#ffffff')
  assert.equal(config.lang, 'zh-CN')
})

test('builds dynamic web manifest from resolved config', () => {
  const config = resolveSiteConfig(`
title: Public Notes
short_name: Notes
description: Shared docs
theme_color: "#111111"
background_color: "#eeeeee"
lang: zh-CN
icon: assets/icon.png
maskable_icon: assets/maskable.svg
`)
  const manifest = buildWebManifest(config)

  assert.equal(manifest.name, 'Public Notes')
  assert.equal(manifest.short_name, 'Notes')
  assert.equal(manifest.description, 'Shared docs')
  assert.equal(manifest.theme_color, '#111111')
  assert.equal(manifest.background_color, '#eeeeee')
  assert.equal(manifest.lang, 'zh-CN')
  assert.deepEqual(manifest.icons, [
    {
      src: '/api/site-icon?kind=icon',
      sizes: '192x192',
      type: 'image/png',
    },
    {
      src: '/api/site-icon?kind=icon',
      sizes: '512x512',
      type: 'image/png',
    },
    {
      src: '/api/site-icon?kind=maskable',
      sizes: 'any',
      type: 'image/svg+xml',
      purpose: 'maskable',
    },
  ])
})
