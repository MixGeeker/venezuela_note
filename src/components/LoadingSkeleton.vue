<template>
  <div v-if="type === 'note'">
    <div class="animate-pulse">
      <div class="h-8 bg-gray-200 rounded w-2/3 mb-4" />
      <div class="flex gap-2 mb-6">
        <div class="h-5 bg-gray-200 rounded w-16" />
        <div class="h-5 bg-gray-200 rounded w-20" />
      </div>
      <div class="space-y-3">
        <div class="h-4 bg-gray-200 rounded" />
        <div class="h-4 bg-gray-200 rounded w-5/6" />
        <div class="h-4 bg-gray-200 rounded w-4/6" />
        <div class="h-32 bg-gray-200 rounded-lg mt-4" />
      </div>
    </div>
  </div>
  <div v-else-if="type === 'list'">
    <div class="animate-pulse space-y-3">
      <div v-for="i in 4" :key="i" class="p-4 bg-white rounded-lg border border-gray-100">
        <div class="h-5 bg-gray-200 rounded w-1/3 mb-2" />
        <div class="h-3 bg-gray-200 rounded w-2/3" />
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
defineProps<{ type: 'note' | 'list' }>()
</script>
