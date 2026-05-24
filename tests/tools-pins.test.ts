import test from 'node:test'
import assert from 'node:assert/strict'
import {
  getPinnedTools,
  normalizePinnedToolIds,
  parsePinnedToolIds,
  serializePinnedToolIds,
  togglePinnedToolId,
  unpinToolId,
} from '../src/tools/pins.ts'
import type { ToolDefinition } from '../src/tools/registry.ts'

const tools: ToolDefinition[] = [
  {
    id: 'cash-bundle',
    title: '货币捆数计算器',
    description: '',
    category: '财务 / 现金',
    route: '/tools/cash-bundle',
    icon: 'cash',
    tags: [],
  },
  {
    id: 'unit-converter',
    title: '单位换算',
    description: '',
    category: '换算',
    route: '/tools/unit-converter',
    icon: 'scale',
    tags: [],
  },
]
const validIds = tools.map((tool) => tool.id)

test('normalizes pinned tool ids with valid ids only and no duplicates', () => {
  assert.deepEqual(
    normalizePinnedToolIds(['missing', 'cash-bundle', 'cash-bundle', 'unit-converter'], validIds),
    ['cash-bundle', 'unit-converter'],
  )
})

test('parses and serializes pinned tool ids safely', () => {
  assert.deepEqual(parsePinnedToolIds(null, validIds), [])
  assert.deepEqual(parsePinnedToolIds('{bad json', validIds), [])
  assert.deepEqual(parsePinnedToolIds(JSON.stringify({ id: 'cash-bundle' }), validIds), [])
  assert.deepEqual(
    parsePinnedToolIds(JSON.stringify(['missing', 'cash-bundle', 1, 'unit-converter']), validIds),
    ['cash-bundle', 'unit-converter'],
  )
  assert.equal(
    serializePinnedToolIds(['missing', 'unit-converter', 'unit-converter', 'cash-bundle'], validIds),
    JSON.stringify(['unit-converter', 'cash-bundle']),
  )
})

test('toggles and unpins tool ids', () => {
  assert.deepEqual(togglePinnedToolId([], 'cash-bundle', validIds), ['cash-bundle'])
  assert.deepEqual(togglePinnedToolId(['cash-bundle'], 'cash-bundle', validIds), [])
  assert.deepEqual(togglePinnedToolId(['cash-bundle'], 'unit-converter', validIds), [
    'unit-converter',
    'cash-bundle',
  ])
  assert.deepEqual(unpinToolId(['cash-bundle', 'unit-converter'], 'cash-bundle'), ['unit-converter'])
})

test('returns pinned tools in saved order and ignores stale ids', () => {
  assert.deepEqual(
    getPinnedTools(['unit-converter', 'missing', 'cash-bundle'], tools).map((tool) => tool.id),
    ['unit-converter', 'cash-bundle'],
  )
})
