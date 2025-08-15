<template>
  <div id="app">
    <header class="bg-blue-600 text-white p-4">
      <h1 class="text-2xl font-bold">{{ appName }}</h1>
    </header>
    <main class="container mx-auto p-4">
      <router-view />
    </main>
    
    <!-- 全域播放器同步組件 -->
    <PlayerSync />
    
    <!-- 播放器控制欄 -->
    <PlayerBar />
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted } from 'vue'
import { usePlayerStore } from '@/stores/player'
import PlayerSync from '@/components/player/PlayerSync.vue'
import PlayerBar from '@/components/layout/PlayerBar.vue'

const appName = ref(import.meta.env.VITE_APP_NAME || 'YouTube Music Player')
const playerStore = usePlayerStore()

onMounted(() => {
  // 初始化播放器狀態同步
  playerStore.loadFromLocalStorage()
  playerStore.setupCrossTabSync()
})
</script>

<style>
#app {
  min-height: 100vh;
  background-color: #f9fafb;
}
</style>