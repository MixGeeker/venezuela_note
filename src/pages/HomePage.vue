<template>
  <MainLayout>
    <div v-if="loading">
      <LoadingSkeleton type="note" />
    </div>

    <template v-else-if="readme">
      <NoteViewer :note="readme" />
    </template>

    <template v-else>
      <div v-if="notesStore.error" class="text-center py-12">
        <p class="text-red-500">{{ notesStore.error }}</p>
        <button
          class="mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          @click="notesStore.fetchTree()"
        >
          Retry
        </button>
      </div>
      <template v-else>
        <h2 class="text-xl font-bold text-gray-900 mb-4">All Notes</h2>
        <NoteList :notes="rootFiles" />
      </template>
    </template>
  </MainLayout>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { useNotesStore } from '@/stores/notes'
import MainLayout from '@/layouts/MainLayout.vue'
import NoteViewer from '@/components/NoteViewer.vue'
import NoteList from '@/components/NoteList.vue'
import LoadingSkeleton from '@/components/LoadingSkeleton.vue'
import type { NoteContent, NoteMeta } from '@/types'

const notesStore = useNotesStore()
const readme = ref<NoteContent | null>(null)
const loading = ref(true)

const rootFiles = computed(() =>
  notesStore.tree.filter((n): n is NoteMeta => n.type === 'file'),
)

onMounted(async () => {
  try {
    const res = await fetch('/api/notes/README.md')
    if (res.ok) {
      readme.value = await res.json()
    }
  } catch {
    // README not available, fall back to file list
  } finally {
    loading.value = false
  }
})
</script>
