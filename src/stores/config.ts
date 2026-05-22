import { defineStore } from 'pinia'
import { ref } from 'vue'
import type { SiteConfig } from '@/types'

export const useConfigStore = defineStore('config', () => {
  const siteConfig = ref<SiteConfig>({
    title: 'Notes',
    description: '',
  })
  const loaded = ref(false)

  async function fetchConfig() {
    try {
      const res = await fetch('/api/config')
      if (res.ok) {
        siteConfig.value = await res.json()
      }
    } catch {
      // keep defaults
    } finally {
      loaded.value = true
    }
  }

  return { siteConfig, loaded, fetchConfig }
})
