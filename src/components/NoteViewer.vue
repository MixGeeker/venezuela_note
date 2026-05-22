<template>
  <article v-if="note">
    <header class="mb-8">
      <h1 class="text-3xl font-bold text-gray-900">
        {{ note.meta.title || displayName(note.meta.name) }}
      </h1>

      <div class="flex flex-wrap items-center gap-3 mt-3 text-sm text-gray-500">
        <span v-if="note.frontmatter?.date">{{ note.frontmatter.date }}</span>
        <span v-if="note.meta.aliases.length">Aliases: {{ note.meta.aliases.join(', ') }}</span>
      </div>

      <div v-if="note.meta.tags.length" class="flex flex-wrap gap-2 mt-3">
        <router-link
          v-for="tag in note.meta.tags"
          :key="tag"
          :to="{ name: 'search', query: { tag } }"
          class="px-2 py-0.5 bg-blue-50 text-blue-700 rounded text-xs hover:bg-blue-100"
        >
          #{{ tag }}
        </router-link>
      </div>
    </header>

    <div
      v-if="note.diagnostics.length"
      class="mb-6 rounded-md border border-amber-200 bg-amber-50 px-4 py-3 text-sm text-amber-900"
    >
      <p class="font-medium">Link diagnostics</p>
      <ul class="mt-2 list-disc pl-5">
        <li v-for="diagnostic in note.diagnostics" :key="`${diagnostic.rawTarget}-${diagnostic.message}`">
          {{ diagnostic.message }}
        </li>
      </ul>
    </div>

    <div class="note-content" v-html="renderedHtml" />

    <section v-if="note.meta.backlinks.length" class="mt-10 border-t border-gray-200 pt-6">
      <h2 class="text-lg font-semibold text-gray-900 mb-3">Backlinks</h2>
      <div class="grid gap-2">
        <router-link
          v-for="backlink in note.meta.backlinks"
          :key="`${backlink.sourcePath}-${backlink.display}`"
          :to="noteRoute(backlink.sourcePath, backlink.anchor)"
          class="rounded-md border border-gray-200 bg-white px-3 py-2 text-sm hover:border-blue-300 hover:bg-blue-50"
        >
          <span class="font-medium text-gray-900">{{ backlink.sourceTitle }}</span>
          <span class="ml-2 text-gray-500">{{ backlink.display }}</span>
        </router-link>
      </div>
    </section>
  </article>
</template>

<script setup lang="ts">
import { computed } from 'vue'
import type { NoteContent } from '@/types'
import { renderMarkdown } from '@/utils/markdown'
import { noteRoute } from '@/utils/routes'
import 'highlight.js/styles/github.css'

const props = defineProps<{ note: NoteContent }>()

const renderedHtml = computed(() => {
  const content = props.note.html || props.note.content
  return renderMarkdown(content, props.note)
})

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
.note-content a.internal-link { font-weight: 500; text-decoration-thickness: 0.08em; }
.note-content .broken-link { color: #b45309; border-bottom: 1px dashed #b45309; cursor: help; }
.note-content blockquote { border-left: 3px solid #d1d5db; padding-left: 1rem; margin: 1rem 0; color: #6b7280; background: #f9fafb; padding: 0.75rem 1rem; border-radius: 0 0.375rem 0.375rem 0; }
.note-content .obsidian-callout { border-left-color: #2563eb; background: #eff6ff; color: #1f2937; }
.note-content .obsidian-callout-title { font-weight: 700; margin-bottom: 0.5rem; color: #1d4ed8; }
.note-content .obsidian-note-embed { border: 1px solid #dbeafe; background: #f8fbff; border-radius: 0.5rem; padding: 0.75rem 1rem; margin: 1rem 0; }
.note-content .obsidian-embed { display: block; max-width: 100%; margin: 1rem 0; border-radius: 0.5rem; }
.note-content .obsidian-pdf-embed { width: 100%; min-height: 70vh; border: 1px solid #e5e7eb; }
.note-content .obsidian-video-embed { width: 100%; }
.note-content .obsidian-block-anchor { scroll-margin-top: 5rem; }
.note-content pre { background: #1f2937; color: #e5e7eb; border-radius: 0.5rem; padding: 1rem; overflow-x: auto; margin-bottom: 1rem; font-size: 0.875rem; }
.note-content code { font-size: 0.875rem; }
.note-content :not(pre) > code { background: #f3f4f6; padding: 0.125rem 0.375rem; border-radius: 0.25rem; color: #dc2626; }
.note-content img { max-width: 100%; border-radius: 0.5rem; margin: 1rem 0; }
.note-content table { width: 100%; border-collapse: collapse; margin-bottom: 1rem; }
.note-content th, .note-content td { border: 1px solid #e5e7eb; padding: 0.5rem 0.75rem; text-align: left; }
.note-content th { background: #f9fafb; font-weight: 600; }
.note-content hr { border: none; border-top: 1px solid #e5e7eb; margin: 1.5rem 0; }
</style>
