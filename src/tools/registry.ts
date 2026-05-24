export interface ToolDefinition {
  id: string
  title: string
  description: string
  category: string
  route: string
  icon: string
  tags: readonly string[]
}

export const TOOL_REGISTRY: readonly ToolDefinition[] = [
  {
    id: 'cash-bundle',
    title: '货币捆数计算器',
    description: '按面额和 500 / 100 / Loose 规格快速计算现金总额、张数，并支持历史和分享。',
    category: '财务 / 现金',
    route: '/tools/cash-bundle',
    icon: 'cash',
    tags: ['VES', 'USD', 'RMB', '现金', '捆数'],
  },
]

export function getToolById(id: string, tools: readonly ToolDefinition[] = TOOL_REGISTRY): ToolDefinition | null {
  return tools.find((tool) => tool.id === id) ?? null
}

export function getToolsByIds(
  ids: readonly string[],
  tools: readonly ToolDefinition[] = TOOL_REGISTRY,
): ToolDefinition[] {
  return ids
    .map((id) => getToolById(id, tools))
    .filter((tool): tool is ToolDefinition => tool !== null)
}

export function groupToolsByCategory(
  tools: readonly ToolDefinition[] = TOOL_REGISTRY,
): Array<{ category: string; tools: ToolDefinition[] }> {
  const categories = new Map<string, ToolDefinition[]>()

  for (const tool of tools) {
    const currentTools = categories.get(tool.category) ?? []
    currentTools.push(tool)
    categories.set(tool.category, currentTools)
  }

  return Array.from(categories, ([category, groupedTools]) => ({
    category,
    tools: groupedTools,
  }))
}
