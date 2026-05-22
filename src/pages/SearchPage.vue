<template>
  <MainLayout>
    <div v-if="notesStore.loading">
      <LoadingSkeleton type="list" />
    </div>

    <template v-else>
      <div class="mb-6">
        <router-link to="/" class="text-sm text-gray-500 hover:text-blue-500">&larr; Back to Home</router-link>
        <h2 class="text-xl font-bold text-gray-900 mt-2">
          <template v-if="query">Search results for "{{ query }}"</template>
          <template v-else>Search</template>
        </h2>
        <p v-if="query && notesStore.searchResults.length > 0" class="text-sm text-gray-500 mt-1">
          Found {{ notesStore.searchResults.length }} result{{ notesStore.searchResults.length === 1 ? '' : 's' }}
        </p>
      </div>

      <div v-if="query && notesStore.searchResults.length === 0" class="text-center py-12 text-gray-400">
        No results found for "{{ query }}"
      </div>

      <div v-else class="grid gap-3">
        <router-link
          v-for="result in notesStore.searchResults"
          :key="result.path"
          :to="`/note/${result.path}`"
          class="block p-4 bg-white rounded-lg border border-gray-200 hover:border-blue-300 hover:shadow-sm transition-colors"
        >
          <h3 class="font-medium text-gray-900">{{ result.name.replace(/\.md$/, '') }}</h3>
          <p class="text-sm text-gray-500 mt-1">{{ result.path }}</p>
          <p v-if="result.textMatches[0]" class="text-sm text-gray-600 mt-2 line-clamp-2">
            {{ result.textMatches[0].fragment }}
          </p>
        </router-link>
      </div>
    </template>
  </MainLayout>
</template>

<script setup lang="ts">
import { watch, computed } from 'vue'
import { useRoute } from 'vue-router'
import { useNotesStore } from '@/stores/notes'
import MainLayout from '@/layouts/MainLayout.vue'
import LoadingSkeleton from '@/components/LoadingSkeleton.vue'

const route = useRoute()
const notesStore = useNotesStore()

const query = computed(() => (route.query.q as string) ?? '')

watch(query, (q) => {
  if (q) notesStore.search(q)
}, { immediate: true })
</script>
