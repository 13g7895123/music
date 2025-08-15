<template>
  <div id="app">
    <header class="bg-blue-600 text-white p-4">
      <h1 class="text-2xl font-bold">{{ appName }}</h1>
    </header>
    <main class="container mx-auto p-4">
      <router-view />
    </main>
  </div>
</template>

<script setup lang="ts">
import { ref } from 'vue'

const appName = ref(import.meta.env.VITE_APP_NAME || 'YouTube Music Player')
</script>

<style>
#app {
  min-height: 100vh;
  background-color: #f9fafb;
}
</style>