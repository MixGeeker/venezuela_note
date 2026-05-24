import { computed, onMounted, onUnmounted, ref } from 'vue'

type PwaInstallMode = 'prompt' | 'manual-ios'
type CompatibleMediaQueryList = MediaQueryList & {
  addEventListener?: (type: string, listener: EventListenerOrEventListenerObject) => void
  removeEventListener?: (type: string, listener: EventListenerOrEventListenerObject) => void
  addListener?: (listener: EventListener) => void
  removeListener?: (listener: EventListener) => void
}

export function usePwaInstall() {
  const deferredPrompt = ref<BeforeInstallPromptEvent | null>(null)
  const isIos = ref(false)
  const isStandalone = ref(false)
  let standaloneQuery: MediaQueryList | null = null

  const installMode = computed<PwaInstallMode | null>(() => {
    if (isStandalone.value) return null
    if (deferredPrompt.value) return 'prompt'
    if (isIos.value) return 'manual-ios'
    return null
  })

  const showInstallEntry = computed(() => installMode.value !== null)

  function updateStandalone() {
    isStandalone.value = Boolean(
      window.matchMedia('(display-mode: standalone)').matches ||
      navigator.standalone,
    )
  }

  function updateIos() {
    isIos.value = /iPad|iPhone|iPod/.test(navigator.userAgent) ||
      (navigator.platform === 'MacIntel' && navigator.maxTouchPoints > 1)
  }

  function handleBeforeInstallPrompt(event: BeforeInstallPromptEvent) {
    event.preventDefault()
    deferredPrompt.value = event
  }

  function handleAppInstalled() {
    deferredPrompt.value = null
    isStandalone.value = true
  }

  function addStandaloneListener(query: MediaQueryList) {
    const compatQuery = query as CompatibleMediaQueryList
    if (typeof compatQuery.addEventListener === 'function') {
      compatQuery.addEventListener('change', updateStandalone)
      return
    }
    compatQuery.addListener?.(updateStandalone)
  }

  function removeStandaloneListener(query: MediaQueryList) {
    const compatQuery = query as CompatibleMediaQueryList
    if (typeof compatQuery.removeEventListener === 'function') {
      compatQuery.removeEventListener('change', updateStandalone)
      return
    }
    compatQuery.removeListener?.(updateStandalone)
  }

  async function installPwa() {
    if (!deferredPrompt.value) return
    const promptEvent = deferredPrompt.value
    try {
      await promptEvent.prompt()
      await promptEvent.userChoice.catch(() => undefined)
    } finally {
      if (deferredPrompt.value === promptEvent) {
        deferredPrompt.value = null
      }
    }
  }

  onMounted(() => {
    updateIos()
    updateStandalone()
    standaloneQuery = window.matchMedia('(display-mode: standalone)')
    addStandaloneListener(standaloneQuery)
    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.addEventListener('appinstalled', handleAppInstalled)
  })

  onUnmounted(() => {
    if (standaloneQuery) removeStandaloneListener(standaloneQuery)
    window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt)
    window.removeEventListener('appinstalled', handleAppInstalled)
  })

  return { showInstallEntry, installMode, installPwa, isStandalone }
}
