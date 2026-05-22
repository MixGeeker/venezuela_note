<template>
  <MainLayout>
    <div v-if="notesStore.loading">
      <LoadingSkeleton type="note" />
    </div>

    <div v-else-if="notesStore.error" class="text-center py-12">
      <div v-if="notesStore.error === 'Note not found'">
        <h2 class="text-2xl font-bold text-gray-900 mb-2">Note Not Found</h2>
        <p class="text-gray-500 mb-4">The note you're looking for doesn't exist.</p>
        <router-link to="/" class="text-blue-500 underline">Back to Home</router-link>
      </div>
      <div v-else>
        <p class="text-red-500">{{ notesStore.error }}</p>
        <button
          class="mt-4 px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600"
          @click="fetchNote()"
        >
          Retry
        </button>
      </div>
    </div>

    <template v-else-if="notesStore.currentNote">
      <!-- Breadcrumb -->
      <nav class="flex items-center gap-1.5 text-sm text-gray-500 mb-6">
        <router-link to="/" class="hover:text-blue-500">Home</router-link>
        <template v-for="(seg, i) in breadcrumbs" :key="i">
          <span>/</span>
          <span :class="i === breadcrumbs.length - 1 ? 'text-gray-900 font-medium' : ''">
            {{ seg }}
          </span>
        </template>
      </nav>

      <NoteViewer :note="notesStore.currentNote" />
    </template>
  </MainLayout>
</template>

<script setup lang="ts">
import { watch, computed } from 'vue'
import { useRoute } from 'vue-router'
import { useNotesStore } from '@/stores/notes'
import MainLayout from '@/layouts/MainLayout.vue'
import NoteViewer from '@/components/NoteViewer.vue'
import LoadingSkeleton from '@/components/LoadingSkeleton.vue'

const route = useRoute()
const notesStore = useNotesStore()

function fetchNote() {
  const path = route.params.path as string
  if (path) notesStore.fetchNote(path)
}

watch(() => route.params.path, fetchNote, { immediate: true })

const breadcrumbs = computed(() => {
  const path = route.params.path as string
  return path ? path.split('/') : []
})
</script>
