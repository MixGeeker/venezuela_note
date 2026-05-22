<template>
  <ul :class="depth > 0 ? 'pl-4' : ''">
    <li v-for="node in nodes" :key="node.path">
      <!-- Directory -->
      <button
        v-if="node.type === 'dir'"
        class="w-full flex items-center gap-1.5 py-1 px-2 rounded text-sm hover:bg-gray-100 text-gray-700"
        @click="toggle(node.path)"
      >
        <svg
          class="w-4 h-4 shrink-0 transition-transform"
          :class="expanded.has(node.path) ? 'rotate-90' : ''"
          fill="none" stroke="currentColor" viewBox="0 0 24 24"
        >
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 5l7 7-7 7" />
        </svg>
        <svg class="w-4 h-4 shrink-0 text-yellow-500" fill="currentColor" viewBox="0 0 20 20">
          <path d="M2 6a2 2 0 012-2h5l2 2h5a2 2 0 012 2v6a2 2 0 01-2 2H4a2 2 0 01-2-2V6z" />
        </svg>
        <span class="truncate">{{ node.name }}</span>
      </button>

      <!-- File -->
      <router-link
        v-else
        :to="noteRoute(node.path)"
        class="flex items-center gap-1.5 py-1 px-2 rounded text-sm hover:bg-gray-100"
        :class="isActive(node.path) ? 'bg-blue-50 text-blue-700' : 'text-gray-600'"
        @click="uiStore.closeSidebar()"
      >
        <svg class="w-4 h-4 shrink-0 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
        <span class="truncate">{{ node.title || displayName(node.name) }}</span>
      </router-link>

      <!-- Children (recursive) -->
      <div v-if="node.type === 'dir' && expanded.has(node.path)">
        <FolderTree :nodes="node.children" :depth="depth + 1" />
      </div>
    </li>
  </ul>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRoute } from 'vue-router'
import { useUiStore } from '@/stores/ui'
import type { TreeNode } from '@/types'
import { noteRoute } from '@/utils/routes'

defineProps<{
  nodes: TreeNode[]
  depth: number
}>()

const route = useRoute()
const uiStore = useUiStore()
const expanded = ref(new Set<string>())

function toggle(path: string) {
  if (expanded.value.has(path)) {
    expanded.value.delete(path)
  } else {
    expanded.value.add(path)
  }
}

function isActive(path: string): boolean {
  return route.params.path === path
}

function displayName(name: string): string {
  return name.replace(/\.md$/, '')
}
</script>
