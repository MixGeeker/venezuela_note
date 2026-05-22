import test from 'node:test'
import assert from 'node:assert/strict'
import {
  buildTreeFromIndex,
  buildVaultIndexFromEntries,
  findNoteByRequestPath,
  parseFrontmatter,
  publicVaultIndex,
  type VaultSourceEntry,
} from '../functions/_shared/obsidian-core.ts'

test('parses YAML and JSON frontmatter values', () => {
  const yaml = parseFrontmatter(`---
title: Getting Started
tags: [guide, setup]
aliases:
  - Start
publish: false
weight: 2
---
Body`)

  assert.equal(yaml.content, 'Body')
  assert.deepEqual(yaml.frontmatter, {
    title: 'Getting Started',
    tags: ['guide', 'setup'],
    aliases: ['Start'],
    publish: false,
    weight: 2,
  })

  const json = parseFrontmatter(`---
{"title":"JSON Note","tags":["json"],"draft":true}
---
Body`)

  assert.deepEqual(json.frontmatter, {
    title: 'JSON Note',
    tags: ['json'],
    draft: true,
  })
})

test('builds public vault index with Obsidian links, aliases, attachments, and diagnostics', () => {
  const entries: VaultSourceEntry[] = [
    {
      name: 'README.md',
      path: 'README.md',
      type: 'file',
      sha: 'a',
      size: 1,
      content: `---
title: Home
tags: [root]
aliases: [Start]
permalink: home
---
# Intro

See [[Guides/Install|Install]] and [relative](Guides/Install.md).
Embed ![[assets/diagram.png|300]].
Broken [[Missing]] and ambiguous [[Duplicate]].
Tagged #inline/tag.
Same note [[#Intro]].
`,
    },
    {
      name: 'Install.md',
      path: 'Guides/Install.md',
      type: 'file',
      sha: 'b',
      size: 1,
      content: `---
title: Install
aliases:
  - Setup
---
# Install

Back to [[Start]].
`,
    },
    {
      name: 'Duplicate.md',
      path: 'Archive/Duplicate.md',
      type: 'file',
      sha: 'c',
      size: 1,
      content: '# Duplicate',
    },
    {
      name: 'Duplicate.md',
      path: 'Other/Duplicate.md',
      type: 'file',
      sha: 'd',
      size: 1,
      content: '# Other duplicate',
    },
    {
      name: 'Draft.md',
      path: 'Draft.md',
      type: 'file',
      sha: 'e',
      size: 1,
      content: `---
draft: true
---
Hidden`,
    },
    {
      name: 'diagram.png',
      path: 'assets/diagram.png',
      type: 'file',
      sha: 'f',
      size: 12,
    },
    {
      name: 'workspace.json',
      path: '.obsidian/workspace.json',
      type: 'file',
      sha: 'g',
      size: 1,
    },
  ]

  const index = buildVaultIndexFromEntries(entries)
  const home = index.notes.find((note) => note.path === 'README.md')
  const install = index.notes.find((note) => note.path === 'Guides/Install.md')

  assert.ok(home)
  assert.ok(install)
  assert.equal(index.notes.some((note) => note.path === 'Draft.md'), false)
  assert.equal(index.attachments[0].path, 'assets/diagram.png')
  assert.deepEqual(home.tags, ['inline/tag', 'root'])
  assert.equal(findNoteByRequestPath(index, 'home')?.path, 'README.md')

  const installLink = home.outboundLinks.find((link) => link.rawTarget === 'Guides/Install')
  assert.equal(installLink?.resolved, true)
  assert.equal(installLink?.targetPath, 'Guides/Install.md')

  const attachment = home.outboundLinks.find((link) => link.rawTarget === 'assets/diagram.png')
  assert.equal(attachment?.targetType, 'attachment')
  assert.equal(attachment?.targetPath, 'assets/diagram.png')

  const aliasBackLink = install.outboundLinks.find((link) => link.rawTarget === 'Start')
  assert.equal(aliasBackLink?.targetPath, 'README.md')

  assert.equal(install.backlinks.some((link) => link.sourcePath === 'README.md'), true)
  assert.equal(index.brokenLinks.some((link) => link.rawTarget === 'Missing'), true)
  assert.equal(index.brokenLinks.some((link) => link.rawTarget === 'Duplicate' && link.reason === 'ambiguous'), true)

  const tree = buildTreeFromIndex(index)
  assert.equal(tree.some((node) => node.type === 'file' && node.path === 'Draft.md'), false)

  const publicIndex = publicVaultIndex(index)
  assert.equal('content' in publicIndex.notes[0], false)
})

test('builds an empty vault index', () => {
  const index = buildVaultIndexFromEntries([])

  assert.deepEqual(index.notes, [])
  assert.deepEqual(index.attachments, [])
  assert.deepEqual(index.tags, [])
  assert.deepEqual(index.aliases, {})
  assert.deepEqual(index.brokenLinks, [])
  assert.deepEqual(index.orphanNotes, [])
  assert.deepEqual(index.graph, { nodes: [], edges: [] })
})

test('resolves localized title fragments to English file paths when unique', () => {
  const index = buildVaultIndexFromEntries([
    {
      name: 'changelog.md',
      path: 'changelog.md',
      type: 'file',
      content: [
        '# 更新日志',
        '参考 [[指南/架构]]、[[指南/API参考]]、[[指南/Obsidian语法]]、[[指南/部署]]。',
      ].join('\n'),
    },
    {
      name: 'architecture.md',
      path: 'guides/architecture.md',
      type: 'file',
      content: `---
title: 系统架构
aliases: [架构设计, 技术架构]
---
# 系统架构`,
    },
    {
      name: 'api-reference.md',
      path: 'guides/api-reference.md',
      type: 'file',
      content: `---
title: API 参考
aliases: [API文档]
---
# API 参考`,
    },
    {
      name: 'obsidian-syntax.md',
      path: 'guides/obsidian-syntax.md',
      type: 'file',
      content: `---
title: Obsidian 语法支持
---
# Obsidian 语法支持`,
    },
    {
      name: 'deployment.md',
      path: 'guides/deployment.md',
      type: 'file',
      content: `---
title: 部署指南
---
# 部署指南`,
    },
  ])

  const changelog = index.notes.find((note) => note.path === 'changelog.md')
  assert.ok(changelog)
  assert.deepEqual(
    changelog.outboundLinks.map((link) => [link.rawTarget, link.targetPath, link.resolved]),
    [
      ['指南/架构', 'guides/architecture.md', true],
      ['指南/API参考', 'guides/api-reference.md', true],
      ['指南/Obsidian语法', 'guides/obsidian-syntax.md', true],
      ['指南/部署', 'guides/deployment.md', true],
    ],
  )
  assert.equal(index.brokenLinks.length, 0)
})
