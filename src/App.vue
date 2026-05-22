<template>
  <RouterView />
  <PwaStatus />
</template>

<script setup lang="ts">
import { RouterView } from 'vue-router'
import PwaStatus from '@/components/PwaStatus.vue'
</script>
