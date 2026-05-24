<template>
  <div v-if="shouldShow">
    <button
      type="button"
      class="fixed bottom-5 right-5 z-40 inline-flex h-12 w-12 items-center justify-center rounded-full bg-gray-900 text-white shadow-lg transition hover:bg-gray-800"
      aria-label="打开收藏工具"
      title="收藏工具"
      @click="drawerOpen = true"
    >
      <svg class="h-6 w-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11.5 3.4a.6.6 0 011 0l2.4 4.9 5.4.8a.6.6 0 01.3 1l-3.9 3.8.9 5.4a.6.6 0 01-.9.6L12 17.4l-4.8 2.5a.6.6 0 01-.9-.6l.9-5.4-3.9-3.8a.6.6 0 01.3-1l5.4-.8 2.5-4.9z" />
      </svg>
      <span
        v-if="pinnedTools.length"
        class="absolute -right-1 -top-1 flex h-5 min-w-5 items-center justify-center rounded-full bg-yellow-400 px-1 text-xs font-bold text-gray-950"
      >
        {{ pinnedTools.length }}
      </span>
    </button>

    <div
      v-if="drawerOpen"
      class="fixed inset-0 z-50 bg-black/35"
      role="presentation"
      @click.self="drawerOpen = false"
    >
      <section class="fixed inset-x-0 bottom-0 max-h-[75vh] rounded-t-xl bg-white shadow-2xl md:left-auto md:right-5 md:bottom-20 md:w-96 md:rounded-xl">
        <header class="flex items-center justify-between border-b border-gray-200 px-4 py-3">
          <div>
            <h2 class="font-semibold text-gray-900">收藏工具</h2>
            <p class="text-sm text-gray-500">{{ pinnedTools.length }} 个已收藏</p>
          </div>
          <button
            type="button"
            class="inline-flex h-9 w-9 items-center justify-center rounded-md border border-gray-200 text-xl leading-none text-gray-500 hover:bg-gray-50"
            aria-label="关闭收藏工具"
            @click="drawerOpen = false"
          >
            ×
          </button>
        </header>

        <div v-if="pinnedTools.length" class="max-h-[56vh] overflow-y-auto">
          <ToolListItem
            v-for="tool in pinnedTools"
            :key="tool.id"
            :tool="tool"
            pinned
            @toggle-pin="togglePin"
            @navigate="drawerOpen = false"
          />
        </div>

        <div v-else class="px-4 py-8 text-center">
          <p class="text-sm text-gray-500">暂无收藏工具</p>
          <router-link
            to="/tools"
            class="mt-4 inline-flex rounded-md bg-gray-900 px-4 py-2 text-sm font-medium text-white hover:bg-gray-800"
            @click="drawerOpen = false"
          >
            查看全部工具
          </router-link>
        </div>
      </section>
    </div>
  </div>
</template>

<script setup lang="ts">
import { computed, onMounted, onUnmounted, ref, watch } from 'vue'
import { useRoute } from 'vue-router'
import ToolListItem from '@/components/ToolListItem.vue'
import {
  PINNED_TOOLS_KEY,
  getPinnedTools,
  parsePinnedToolIds,
  serializePinnedToolIds,
  togglePinnedToolId,
} from '@/tools/pins'

const route = useRoute()
const drawerOpen = ref(false)
const pinnedIds = ref<string[]>([])
const pinnedTools = computed(() => getPinnedTools(pinnedIds.value))
const shouldShow = computed(() => !route.path.startsWith('/tools'))

onMounted(() => {
  loadPinnedTools()
  window.addEventListener('storage', onStorage)
})

onUnmounted(() => {
  window.removeEventListener('storage', onStorage)
})

watch(() => route.fullPath, () => {
  drawerOpen.value = false
  loadPinnedTools()
})

function loadPinnedTools() {
  pinnedIds.value = parsePinnedToolIds(localStorage.getItem(PINNED_TOOLS_KEY))
}

function persistPinnedTools() {
  localStorage.setItem(PINNED_TOOLS_KEY, serializePinnedToolIds(pinnedIds.value))
}

function togglePin(id: string) {
  pinnedIds.value = togglePinnedToolId(pinnedIds.value, id)
  persistPinnedTools()
}

function onStorage(event: StorageEvent) {
  if (event.key === PINNED_TOOLS_KEY) loadPinnedTools()
}
</script>
