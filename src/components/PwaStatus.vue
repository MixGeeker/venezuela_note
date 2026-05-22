<template>
  <div class="fixed bottom-4 right-4 z-50 flex max-w-[calc(100vw-2rem)] flex-col items-end gap-2 text-sm">
    <div
      v-if="!isOnline"
      class="rounded-md border border-amber-200 bg-amber-50 px-3 py-2 font-medium text-amber-900 shadow-sm"
      role="status"
    >
      离线模式
    </div>

    <div
      v-if="offlineReady && showOfflineReady"
      class="flex items-center gap-3 rounded-md border border-emerald-200 bg-emerald-50 px-3 py-2 text-emerald-900 shadow-sm"
      role="status"
    >
      <span class="font-medium">已可离线使用</span>
      <button
        type="button"
        class="grid size-6 place-items-center rounded text-lg leading-none text-emerald-800 hover:bg-emerald-100"
        aria-label="关闭离线提示"
        @click="showOfflineReady = false"
      >
        ×
      </button>
    </div>

    <div
      v-if="needRefresh"
      class="flex flex-wrap items-center justify-end gap-2 rounded-md border border-blue-200 bg-white px-3 py-2 text-blue-950 shadow-sm"
      role="status"
    >
      <span class="font-medium">新版本可用</span>
      <button
        type="button"
        class="rounded bg-blue-600 px-2.5 py-1 font-medium text-white hover:bg-blue-700"
        @click="refreshApp"
      >
        刷新
      </button>
      <button
        type="button"
        class="grid size-7 place-items-center rounded text-lg leading-none text-blue-800 hover:bg-blue-50"
        aria-label="关闭更新提示"
        @click="needRefresh = false"
      >
        ×
      </button>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { useOnline } from '@vueuse/core'
import { useRegisterSW } from 'virtual:pwa-register/vue'

const isOnline = useOnline()
const showOfflineReady = ref(true)
const { offlineReady, needRefresh, updateServiceWorker } = useRegisterSW()

watch(offlineReady, (ready) => {
  if (ready) showOfflineReady.value = true
})

function refreshApp() {
  updateServiceWorker(true)
}
</script>
