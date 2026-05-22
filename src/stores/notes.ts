import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { TreeNode, NoteContent, SearchResult } from '@/types'
import { encodeVaultPath } from '@/utils/routes'

export const useNotesStore = defineStore('notes', () => {
  const tree = ref<TreeNode[]>([])
  const currentNote = ref<NoteContent | null>(null)
  const searchResults = ref<SearchResult[]>([])
  const loading = ref(false)
  const error = ref<string | null>(null)

  async function fetchTree() {
    loading.value = true
    error.value = null
    try {
      const res = await fetch('/api/notes')
      if (!res.ok) throw new Error(`Failed to fetch tree: ${res.status}`)
      tree.value = await res.json()
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Unknown error'
    } finally {
      loading.value = false
    }
  }

  async function fetchNote(path: string) {
    loading.value = true
    error.value = null
    try {
      const res = await fetch(`/api/notes/${encodeVaultPath(path)}`)
      if (!res.ok) {
        if (res.status === 404) throw new Error('Note not found')
        throw new Error(`Failed to fetch note: ${res.status}`)
      }
      currentNote.value = await res.json()
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Unknown error'
    } finally {
      loading.value = false
    }
  }

  async function search(query: string) {
    loading.value = true
    error.value = null
    try {
      const isTagSearch = query.startsWith('#')
      const params = new URLSearchParams(
        isTagSearch ? { tag: query.slice(1) } : { q: query },
      )
      const res = await fetch(`/api/search?${params.toString()}`)
      if (!res.ok) throw new Error(`Search failed: ${res.status}`)
      searchResults.value = await res.json()
    } catch (e) {
      error.value = e instanceof Error ? e.message : 'Unknown error'
    } finally {
      loading.value = false
    }
  }

  return { tree, currentNote, searchResults, loading, error, fetchTree, fetchNote, search }
})
