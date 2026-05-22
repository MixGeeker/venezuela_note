import { ref } from 'vue'
import type { ApiError } from '@/types'

export function useApi() {
  const loading = ref(false)
  const error = ref<ApiError | null>(null)

  async function get<T>(path: string): Promise<T> {
    loading.value = true
    error.value = null
    try {
      const res = await fetch(path)
      if (!res.ok) {
        const body = await res.json().catch(() => ({ message: res.statusText })) as { message?: string }
        throw { message: body.message ?? res.statusText, status: res.status } as ApiError
      }
      return (await res.json()) as T
    } finally {
      loading.value = false
    }
  }

  return { loading, error, get }
}
