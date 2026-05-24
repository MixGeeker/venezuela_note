<template>
  <div class="flex items-start gap-3 border-b border-gray-100 px-4 py-3 last:border-b-0">
    <div class="mt-0.5 flex h-9 w-9 shrink-0 items-center justify-center rounded-md bg-amber-50 text-amber-700">
      <svg v-if="tool.icon === 'cash'" class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M3 7h18v10H3V7zm3 3h.01M18 14h.01M12 14a2 2 0 100-4 2 2 0 000 4z" />
      </svg>
      <svg v-else class="h-5 w-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M19.4 13.5a7.8 7.8 0 000-3l2-1.6-2-3.5-2.4 1a8.8 8.8 0 00-2.6-1.5L14 2h-4l-.4 2.9A8.8 8.8 0 007 6.4l-2.4-1-2 3.5 2 1.6a7.8 7.8 0 000 3l-2 1.6 2 3.5 2.4-1a8.8 8.8 0 002.6 1.5L10 22h4l.4-2.9a8.8 8.8 0 002.6-1.5l2.4 1 2-3.5-2-1.6zM12 15a3 3 0 110-6 3 3 0 010 6z" />
      </svg>
    </div>

    <router-link :to="tool.route" class="min-w-0 flex-1" @click="$emit('navigate')">
      <div class="flex flex-wrap items-center gap-2">
        <h3 class="font-semibold text-gray-900">{{ tool.title }}</h3>
        <span class="rounded bg-gray-100 px-1.5 py-0.5 text-xs font-medium text-gray-500">{{ tool.category }}</span>
      </div>
      <p class="mt-1 text-sm leading-5 text-gray-500">{{ tool.description }}</p>
      <div class="mt-2 flex flex-wrap gap-1.5">
        <span
          v-for="tag in tool.tags"
          :key="tag"
          class="rounded bg-blue-50 px-1.5 py-0.5 text-xs text-blue-700"
        >
          {{ tag }}
        </span>
      </div>
    </router-link>

    <button
      type="button"
      :class="[
        'mt-0.5 inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-md border transition',
        pinned
          ? 'border-yellow-300 bg-yellow-50 text-yellow-700 hover:bg-yellow-100'
          : 'border-gray-200 bg-white text-gray-400 hover:border-yellow-300 hover:text-yellow-600',
      ]"
      :aria-label="pinned ? `取消收藏 ${tool.title}` : `收藏 ${tool.title}`"
      :title="pinned ? '取消收藏' : '收藏'"
      @click="$emit('togglePin', tool.id)"
    >
      <svg class="h-5 w-5" :fill="pinned ? 'currentColor' : 'none'" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11.5 3.4a.6.6 0 011 0l2.4 4.9 5.4.8a.6.6 0 01.3 1l-3.9 3.8.9 5.4a.6.6 0 01-.9.6L12 17.4l-4.8 2.5a.6.6 0 01-.9-.6l.9-5.4-3.9-3.8a.6.6 0 01.3-1l5.4-.8 2.5-4.9z" />
      </svg>
    </button>
  </div>
</template>

<script setup lang="ts">
import type { ToolDefinition } from '@/tools/registry'

defineProps<{
  tool: ToolDefinition
  pinned: boolean
}>()

defineEmits<{
  togglePin: [id: string]
  navigate: []
}>()
</script>
