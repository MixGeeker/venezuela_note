<template>
  <MainLayout>
    <div v-if="notesStore.loading && notesStore.tree.length === 0">
      <LoadingSkeleton type="list" />
    </div>

    <div v-else-if="notesStore.error" class="text-center py-12">
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
  </MainLayout>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import { useNotesStore } from '@/stores/notes'
import MainLayout from '@/layouts/MainLayout.vue'
import NoteList from '@/components/NoteList.vue'
import LoadingSkeleton from '@/components/LoadingSkeleton.vue'
import type { NoteMeta } from '@/types'

const notesStore = useNotesStore()

const rootFiles = computed(() =>
  notesStore.tree.filter((n): n is NoteMeta => n.type === 'file'),
)
</script>
