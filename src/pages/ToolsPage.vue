<template>
  <MainLayout>
    <div class="mb-6">
      <router-link to="/" class="text-sm text-gray-500 hover:text-blue-500">&larr; Back to Home</router-link>
      <h1 class="mt-2 text-2xl font-bold text-gray-900">工具</h1>
      <p class="mt-1 text-sm text-gray-500">收藏常用工具后，可以从笔记页右下角快速打开。</p>
    </div>

    <div class="space-y-5">
      <section
        v-for="group in groupedTools"
        :key="group.category"
        class="overflow-hidden rounded-lg border border-gray-200 bg-white"
      >
        <div class="flex items-center justify-between border-b border-gray-200 bg-gray-50 px-4 py-3">
          <h2 class="font-semibold text-gray-900">{{ group.category }}</h2>
          <span class="text-sm text-gray-500">{{ group.tools.length }} 个工具</span>
        </div>

        <ToolListItem
          v-for="tool in group.tools"
          :key="tool.id"
          :tool="tool"
          :pinned="isPinnedToolId(tool.id, pinnedIds)"
          @toggle-pin="togglePin"
        />
      </section>
    </div>
  </MainLayout>
</template>

<script setup lang="ts">
import { onMounted, ref } from 'vue'
import MainLayout from '@/layouts/MainLayout.vue'
import ToolListItem from '@/components/ToolListItem.vue'
import { groupToolsByCategory } from '@/tools/registry'
import {
  PINNED_TOOLS_KEY,
  isPinnedToolId,
  parsePinnedToolIds,
  serializePinnedToolIds,
  togglePinnedToolId,
} from '@/tools/pins'

const groupedTools = groupToolsByCategory()
const pinnedIds = ref<string[]>([])

onMounted(() => {
  pinnedIds.value = parsePinnedToolIds(localStorage.getItem(PINNED_TOOLS_KEY))
})

function togglePin(id: string) {
  pinnedIds.value = togglePinnedToolId(pinnedIds.value, id)
  localStorage.setItem(PINNED_TOOLS_KEY, serializePinnedToolIds(pinnedIds.value))
}
</script>
