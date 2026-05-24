<template>
  <div class="min-h-screen bg-gray-50">
    <!-- Header -->
    <header class="fixed top-0 left-0 right-0 z-30 h-14 bg-white border-b border-gray-200 flex items-center px-4 gap-3">
      <button
        class="md:hidden p-2 -ml-2 rounded-lg hover:bg-gray-100"
        @click="uiStore.toggleSidebar"
      >
        <svg class="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M4 6h16M4 12h16M4 18h16" />
        </svg>
      </button>
      <router-link to="/" class="font-bold text-lg text-gray-900">{{ configStore.siteConfig.title }}</router-link>
      <div class="flex-1" />
      <SearchBar />
    </header>

    <!-- Mobile backdrop -->
    <div
      v-if="uiStore.sidebarOpen"
      class="fixed inset-0 z-20 bg-black/40 md:hidden"
      @click="uiStore.closeSidebar"
    />

    <!-- Sidebar -->
    <aside
      :class="[
        'fixed top-14 left-0 bottom-0 z-20 flex w-72 flex-col overflow-hidden bg-white border-r border-gray-200 transition-transform duration-200',
        uiStore.sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0',
      ]"
    >
      <div class="flex-1 overflow-y-auto p-4">
        <FolderTree :nodes="notesStore.tree" :depth="0" />
      </div>
      <div class="border-t border-gray-200 p-3">
        <router-link
          to="/tools"
          :class="[
            'flex items-center gap-2 rounded-md px-3 py-2 text-sm font-medium transition-colors',
            route.path.startsWith('/tools')
              ? 'bg-blue-50 text-blue-700'
              : 'text-gray-700 hover:bg-gray-100',
          ]"
          @click="uiStore.closeSidebar()"
        >
          <svg class="h-4 w-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M11.5 3.4a.6.6 0 011 0l2.4 4.9 5.4.8a.6.6 0 01.3 1l-3.9 3.8.9 5.4a.6.6 0 01-.9.6L12 17.4l-4.8 2.5a.6.6 0 01-.9-.6l.9-5.4-3.9-3.8a.6.6 0 01.3-1l5.4-.8 2.5-4.9z" />
          </svg>
          <span>工具</span>
        </router-link>
      </div>
      <PwaInstallButton />
    </aside>

    <!-- Main content -->
    <main class="pt-14 md:ml-72">
      <div class="max-w-4xl mx-auto p-6">
        <slot />
      </div>
    </main>

    <PinnedToolsFab />
  </div>
</template>

<script setup lang="ts">
import { onMounted, watch } from 'vue'
import { useRoute } from 'vue-router'
import { useNotesStore } from '@/stores/notes'
import { useUiStore } from '@/stores/ui'
import { useConfigStore } from '@/stores/config'
import FolderTree from '@/components/FolderTree.vue'
import PinnedToolsFab from '@/components/PinnedToolsFab.vue'
import PwaInstallButton from '@/components/PwaInstallButton.vue'
import SearchBar from '@/components/SearchBar.vue'

const route = useRoute()
const notesStore = useNotesStore()
const uiStore = useUiStore()
const configStore = useConfigStore()

watch(() => configStore.siteConfig.title, (title) => {
  document.title = title
})

onMounted(() => {
  if (notesStore.tree.length === 0) {
    notesStore.fetchTree()
  }
})
</script>
