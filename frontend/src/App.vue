<template>
  <div id="app" :class="appClasses">
    <!-- 桌面版頂部標題欄 -->
    <header v-if="!isMobile" class="app-header">
      <div class="container">
        <h1 class="app-title">{{ appName }}</h1>
        <div class="header-actions">
          <!-- 可添加搜尋框、用戶選單等 -->
        </div>
      </div>
    </header>
    
    <!-- 主要內容區 -->
    <main class="main-content" :class="{ 'with-mobile-nav': isMobile }">
      <div class="container">
        <router-view />
      </div>
    </main>
    
    <!-- 全域播放器同步組件 -->
    <PlayerSync />
    
    <!-- 播放器控制欄 -->
    <PlayerBar :class="{ 'with-mobile-nav': isMobile }" />
    
    <!-- 行動裝置底部導航 -->
    <MobileNav />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted } from 'vue'
import { usePlayerStore } from '@/stores/player'
import { useBreakpoints, getBreakpointClasses } from '@/composables/useBreakpoints'
import PlayerSync from '@/components/player/PlayerSync.vue'
import PlayerBar from '@/components/layout/PlayerBar.vue'
import MobileNav from '@/components/layout/MobileNav.vue'

const appName = ref(import.meta.env.VITE_APP_NAME || 'YouTube Music Player')
const playerStore = usePlayerStore()
const { isMobile, isTablet, isDesktop } = useBreakpoints()

// 動態類別
const appClasses = computed(() => {
  const classes = ['app']
  
  if (isMobile.value) classes.push('app-mobile')
  if (isTablet.value) classes.push('app-tablet')
  if (isDesktop.value) classes.push('app-desktop')
  
  return classes
})

onMounted(() => {
  // 初始化播放器狀態同步
  playerStore.loadFromLocalStorage()
  playerStore.setupCrossTabSync()
})
</script>

<style lang="scss">
@import '@/styles/main.scss';

#app {
  min-height: 100vh;
  background: var(--bg-primary);
  color: var(--text-primary);
  position: relative;
}

.app-header {
  background: var(--bg-primary);
  border-bottom: 1px solid var(--border-color);
  padding: 1rem 0;
  position: sticky;
  top: 0;
  z-index: var(--z-sticky);

  .container {
    display: flex;
    align-items: center;
    justify-content: space-between;
  }

  .app-title {
    margin: 0;
    font-size: 1.5rem;
    font-weight: 700;
    color: var(--text-primary);
  }

  .header-actions {
    display: flex;
    align-items: center;
    gap: 1rem;
  }
}

.main-content {
  flex: 1;
  padding: 2rem 0;
  min-height: calc(100vh - 80px);

  &.with-mobile-nav {
    padding-bottom: calc(2rem + 60px + 80px); // 內容 + 底部導航 + 播放器
  }

  .container {
    max-width: 1200px;
  }
}

// 應用程式狀態類別
.app-mobile {
  .main-content {
    padding: 1rem 0;
    min-height: calc(100vh - 140px); // 調整為行動裝置高度
  }
}

.app-tablet {
  .main-content {
    padding: 1.5rem 0;
  }
}

.app-desktop {
  .main-content {
    padding: 2rem 0;
  }
}

// 播放器與導航的協調
.player-bar.with-mobile-nav {
  bottom: 60px; // 在底部導航上方
}

// 響應式調整
@include respond-to(sm) {
  .main-content {
    padding: 1.5rem 0;
  }
}

@include respond-to(md) {
  .main-content {
    padding: 2rem 0;
  }
}

@include respond-to(lg) {
  .app-header {
    padding: 1.5rem 0;
  }

  .main-content {
    padding: 2.5rem 0;
  }
}

// 安全區域適配
@supports (padding: max(0px)) {
  .app-mobile {
    .main-content.with-mobile-nav {
      padding-bottom: calc(2rem + 60px + 80px + env(safe-area-inset-bottom));
    }
  }
}

// 深色主題特殊處理
@media (prefers-color-scheme: dark) {
  .app-header {
    background: var(--bg-primary);
    border-bottom-color: var(--border-color);
  }
}

// 減少動畫效果（使用者偏好）
@media (prefers-reduced-motion: reduce) {
  .app-header {
    transition: none !important;
  }
}
</style>