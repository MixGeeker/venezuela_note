<template>
  <RouterView />
  <PwaStatus />
</template>

<script setup lang="ts">
import { storeToRefs } from 'pinia'
import { RouterView } from 'vue-router'
import PwaStatus from '@/components/PwaStatus.vue'
import { useConfigStore } from '@/stores/config'
import { useSiteHead } from '@/composables/useSiteHead'

const configStore = useConfigStore()
const { siteConfig } = storeToRefs(configStore)
useSiteHead(siteConfig)
</script>
