<template>
  <div v-if="notes.length === 0" class="text-gray-400 text-center py-12">
    No notes in this directory
  </div>
  <div v-else class="grid gap-3">
    <router-link
      v-for="note in notes"
      :key="note.path"
      :to="noteRoute(note.path)"
      class="block p-4 bg-white rounded-lg border border-gray-200 hover:border-blue-300 hover:shadow-sm transition-colors"
    >
      <h3 class="font-medium text-gray-900">{{ note.title || displayName(note.name) }}</h3>
      <p class="text-sm text-gray-500 mt-1">{{ note.path }}</p>
    </router-link>
  </div>
</template>

<script setup lang="ts">
import type { NoteMeta } from '@/types'
import { noteRoute } from '@/utils/routes'

defineProps<{ notes: NoteMeta[] }>()

function displayName(name: string): string {
  return name.replace(/\.md$/, '')
}
</script>
