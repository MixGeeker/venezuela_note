import { TOOL_REGISTRY, getToolsByIds, type ToolDefinition } from './registry.ts'

export const PINNED_TOOLS_KEY = 'note-system:tools:pinned:v1'

export function validToolIds(tools: readonly ToolDefinition[] = TOOL_REGISTRY): string[] {
  return tools.map((tool) => tool.id)
}

export function normalizePinnedToolIds(
  ids: readonly string[],
  validIds: readonly string[] = validToolIds(),
): string[] {
  const validIdSet = new Set(validIds)
  const seen = new Set<string>()
  const normalized: string[] = []

  for (const id of ids) {
    if (!validIdSet.has(id) || seen.has(id)) continue
    seen.add(id)
    normalized.push(id)
  }

  return normalized
}

export function parsePinnedToolIds(
  raw: string | null,
  validIds: readonly string[] = validToolIds(),
): string[] {
  if (!raw) return []

  try {
    const parsed: unknown = JSON.parse(raw)
    if (!Array.isArray(parsed)) return []

    return normalizePinnedToolIds(
      parsed.filter((id): id is string => typeof id === 'string'),
      validIds,
    )
  } catch {
    return []
  }
}

export function serializePinnedToolIds(
  ids: readonly string[],
  validIds: readonly string[] = validToolIds(),
): string {
  return JSON.stringify(normalizePinnedToolIds(ids, validIds))
}

export function isPinnedToolId(id: string, ids: readonly string[]): boolean {
  return ids.includes(id)
}

export function pinToolId(
  ids: readonly string[],
  id: string,
  validIds: readonly string[] = validToolIds(),
): string[] {
  return normalizePinnedToolIds([id, ...ids], validIds)
}

export function unpinToolId(ids: readonly string[], id: string): string[] {
  return ids.filter((toolId) => toolId !== id)
}

export function togglePinnedToolId(
  ids: readonly string[],
  id: string,
  validIds: readonly string[] = validToolIds(),
): string[] {
  if (isPinnedToolId(id, ids)) return unpinToolId(ids, id)
  return pinToolId(ids, id, validIds)
}

export function getPinnedTools(
  ids: readonly string[],
  tools: readonly ToolDefinition[] = TOOL_REGISTRY,
): ToolDefinition[] {
  return getToolsByIds(normalizePinnedToolIds(ids, validToolIds(tools)), tools)
}
