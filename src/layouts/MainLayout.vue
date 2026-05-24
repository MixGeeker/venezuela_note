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
        'fixed top-14 left-0 bottom-0 z-20 w-72 bg-white border-r border-gray-200 overflow-y-auto transition-transform duration-200',
        uiStore.sidebarOpen ? 'translate-x-0' : '-translate-x-full md:translate-x-0',
      ]"
    >
      <div class="p-4">
        <PwaInstallButton />
        <FolderTree :nodes="notesStore.tree" :depth="0" />
      </div>
    </aside>

    <!-- Main content -->
    <main class="pt-14 md:ml-72">
      <div class="max-w-4xl mx-auto p-6">
        <slot />
      </div>
    </main>
  </div>
</template>

<script setup lang="ts">
import { onMounted, watch } from 'vue'
import { useNotesStore } from '@/stores/notes'
import { useUiStore } from '@/stores/ui'
import { useConfigStore } from '@/stores/config'
import FolderTree from '@/components/FolderTree.vue'
import PwaInstallButton from '@/components/PwaInstallButton.vue'
import SearchBar from '@/components/SearchBar.vue'

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
