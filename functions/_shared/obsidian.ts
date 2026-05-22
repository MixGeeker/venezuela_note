import { decodeBase64, listDirectory, getFileContent } from './github'
import {
  buildVaultIndexFromEntries,
  isAttachmentPath,
  isHiddenOrPrivatePath,
  isMarkdownPath,
  normalizeVaultPath,
  type VaultIndex,
  type VaultSourceEntry,
} from './obsidian-core'

interface Env {
  GITHUB_TOKEN: string
  GITHUB_OWNER: string
  GITHUB_REPO: string
  NOTES_PATH: string
  NOTES_CACHE: KVNamespace
}

const CACHE_KEY = 'vault:index:v2'
const CACHE_TTL_SECONDS = 300

export async function getVaultIndex(env: Env): Promise<VaultIndex> {
  const cached = await env.NOTES_CACHE.get<VaultIndex>(CACHE_KEY, 'json')
  if (cached) return cached

  const entries = await fetchVaultEntries(env, '')
  const index = buildVaultIndexFromEntries(entries)
  await env.NOTES_CACHE.put(CACHE_KEY, JSON.stringify(index), { expirationTtl: CACHE_TTL_SECONDS })
  return index
}

async function fetchVaultEntries(env: Env, dirPath: string): Promise<VaultSourceEntry[]> {
  const items = await listDirectory(env, dirPath)
  const entries: VaultSourceEntry[] = []

  for (const item of items) {
    const relativePath = relativeVaultPath(env, item.path)
    const normalized = normalizeVaultPath(relativePath)
    if (!normalized || isHiddenOrPrivatePath(normalized)) continue

    if (item.type === 'dir') {
      entries.push(...await fetchVaultEntries(env, normalized))
      continue
    }

    if (isMarkdownPath(normalized)) {
      const file = await getFileContent(env, normalized)
      entries.push({
        name: item.name,
        path: normalized,
        type: 'file',
        sha: item.sha,
        size: item.size,
        content: decodeBase64(file.content),
      })
      continue
    }

    if (isAttachmentPath(normalized)) {
      entries.push({
        name: item.name,
        path: normalized,
        type: 'file',
        sha: item.sha,
        size: item.size,
      })
    }
  }

  return entries
}

function relativeVaultPath(env: Env, itemPath: string): string {
  const root = normalizeVaultPath(env.NOTES_PATH ?? '') ?? ''
  if (!root) return itemPath
  return itemPath.replace(new RegExp(`^${escapeRegex(root)}/?`), '')
}

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
