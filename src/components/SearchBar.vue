<template>
  <div class="relative" ref="containerRef">
    <div class="flex items-center bg-gray-100 rounded-lg px-3 py-1.5">
      <svg class="w-4 h-4 text-gray-400 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
      </svg>
      <input
        v-model="query"
        type="text"
        placeholder="Search notes..."
        class="bg-transparent border-none outline-none text-sm ml-2 w-40 md:w-56"
        @input="onInput"
        @keydown.enter="goToSearch"
        @keydown.escape="showDropdown = false"
        @focus="onFocus"
      />
    </div>

    <!-- Dropdown results -->
    <div
      v-if="showDropdown && notesStore.searchResults.length > 0"
      class="absolute right-0 top-full mt-2 w-80 bg-white rounded-lg shadow-lg border border-gray-200 max-h-96 overflow-y-auto z-50"
    >
      <router-link
        v-for="result in notesStore.searchResults"
        :key="result.path"
        :to="`/note/${result.path}`"
        class="block px-4 py-3 hover:bg-gray-50 border-b border-gray-100 last:border-0"
        @click="showDropdown = false; query = ''"
      >
        <div class="text-sm font-medium text-gray-900">{{ result.name.replace(/\.md$/, '') }}</div>
        <div class="text-xs text-gray-500 mt-0.5">{{ result.path }}</div>
      </router-link>
      <router-link
        :to="`/search?q=${encodeURIComponent(query)}`"
        class="block px-4 py-2.5 text-sm text-blue-600 hover:bg-gray-50 text-center border-t border-gray-200"
        @click="showDropdown = false"
      >
        View all results
      </router-link>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'
import { useRouter } from 'vue-router'
import { useDebounceFn, onClickOutside } from '@vueuse/core'
import { useNotesStore } from '@/stores/notes'

const router = useRouter()
const notesStore = useNotesStore()
const containerRef = ref<HTMLElement | null>(null)
const query = ref('')
const showDropdown = ref(false)

const debouncedSearch = useDebounceFn(async (q: string) => {
  if (q.length < 2) return
  await notesStore.search(q)
  showDropdown.value = true
}, 300)

function onInput() {
  debouncedSearch(query.value)
}

function onFocus() {
  if (notesStore.searchResults.length > 0) {
    showDropdown.value = true
  }
}

function goToSearch() {
  if (query.value.length >= 2) {
    router.push(`/search?q=${encodeURIComponent(query.value)}`)
    showDropdown.value = false
  }
}

onClickOutside(containerRef, () => {
  showDropdown.value = false
})
</script>
