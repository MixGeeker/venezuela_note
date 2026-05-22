<template>
  <article v-if="note">
    <!-- Frontmatter header -->
    <div v-if="note.frontmatter" class="mb-8">
      <h1 class="text-3xl font-bold text-gray-900">
        {{ note.frontmatter.title ?? displayName(note.meta.name) }}
      </h1>
      <div class="flex items-center gap-3 mt-3 text-sm text-gray-500">
        <span v-if="note.frontmatter.date">{{ note.frontmatter.date }}</span>
      </div>
      <div v-if="note.frontmatter.tags" class="flex gap-2 mt-3">
        <span
          v-for="tag in (note.frontmatter.tags as string[])"
          :key="tag"
          class="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs"
        >
          {{ tag }}
        </span>
      </div>
    </div>

    <!-- Markdown content -->
    <div class="note-content" v-html="note.html" />
  </article>
</template>

<script setup lang="ts">
import type { NoteContent } from '@/types'
import 'highlight.js/styles/github.css'

defineProps<{ note: NoteContent }>()

function displayName(name: string): string {
  return name.replace(/\.md$/, '')
}
</script>

<style>
.note-content h1 { font-size: 1.875rem; font-weight: 700; margin-bottom: 1rem; margin-top: 2rem; }
.note-content h2 { font-size: 1.5rem; font-weight: 600; margin-bottom: 0.75rem; margin-top: 1.5rem; }
.note-content h3 { font-size: 1.25rem; font-weight: 600; margin-bottom: 0.5rem; margin-top: 1.25rem; }
.note-content p { margin-bottom: 1rem; line-height: 1.75; }
.note-content ul, .note-content ol { margin-bottom: 1rem; padding-left: 1.5rem; }
.note-content ul { list-style-type: disc; }
.note-content ol { list-style-type: decimal; }
.note-content li { margin-bottom: 0.25rem; line-height: 1.75; }
.note-content a { color: #2563eb; text-decoration: underline; }
.note-content blockquote { border-left: 3px solid #d1d5db; padding-left: 1rem; margin: 1rem 0; color: #6b7280; background: #f9fafb; padding: 0.75rem 1rem; border-radius: 0 0.375rem 0.375rem 0; }
.note-content pre { background: #1f2937; color: #e5e7eb; border-radius: 0.5rem; padding: 1rem; overflow-x: auto; margin-bottom: 1rem; font-size: 0.875rem; }
.note-content code { font-size: 0.875rem; }
.note-content :not(pre) > code { background: #f3f4f6; padding: 0.125rem 0.375rem; border-radius: 0.25rem; color: #dc2626; }
.note-content img { max-width: 100%; border-radius: 0.5rem; margin: 1rem 0; }
.note-content table { width: 100%; border-collapse: collapse; margin-bottom: 1rem; }
.note-content th, .note-content td { border: 1px solid #e5e7eb; padding: 0.5rem 0.75rem; text-align: left; }
.note-content th { background: #f9fafb; font-weight: 600; }
.note-content hr { border: none; border-top: 1px solid #e5e7eb; margin: 1.5rem 0; }
</style>
