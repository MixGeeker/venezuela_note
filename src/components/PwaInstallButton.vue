<template>
  <div v-if="showInstallEntry" class="border-t border-gray-100 p-4">
    <button
      type="button"
      class="flex w-full items-center gap-2 rounded-md border border-gray-200 bg-white px-3 py-2 text-sm font-medium text-gray-700 shadow-sm hover:border-blue-200 hover:bg-blue-50 hover:text-blue-700"
      :aria-expanded="installMode === 'manual-ios' ? showManualHelp : undefined"
      :aria-controls="installMode === 'manual-ios' ? 'pwa-install-help' : undefined"
      @click="handleInstallClick"
    >
      <svg class="size-4 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24" aria-hidden="true">
        <path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M12 3v12m0 0 4-4m-4 4-4-4M5 19h14" />
      </svg>
      <span>安装到本地</span>
    </button>

    <div
      v-if="showManualHelp"
      id="pwa-install-help"
      class="mt-3 rounded-md border border-blue-100 bg-blue-50 px-3 py-3 text-sm text-blue-950"
    >
      <div class="flex items-start gap-2">
        <div class="min-w-0 flex-1">
          <p class="font-semibold">安装到主屏幕</p>
          <p class="mt-1 leading-6 text-blue-900">
            点击浏览器分享按钮，然后选择“保存/添加到主屏幕”。
          </p>
        </div>
        <button
          type="button"
          class="grid size-6 shrink-0 place-items-center rounded text-lg leading-none text-blue-800 hover:bg-blue-100"
          aria-label="关闭安装说明"
          @click="showManualHelp = false"
        >
          ×
        </button>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, watch } from 'vue'
import { usePwaInstall } from '@/composables/usePwaInstall'

const { showInstallEntry, installMode, installPwa } = usePwaInstall()
const showManualHelp = ref(false)

watch(showInstallEntry, (visible) => {
  if (!visible) showManualHelp.value = false
})

watch(installMode, () => {
  showManualHelp.value = false
})

async function handleInstallClick() {
  if (installMode.value === 'manual-ios') {
    showManualHelp.value = !showManualHelp.value
    return
  }

  await installPwa()
}
</script>
