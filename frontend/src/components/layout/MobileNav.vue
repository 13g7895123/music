<template>
  <nav class="mobile-nav" v-if="isMobile">
    <div class="nav-container">
      <router-link 
        to="/dashboard" 
        class="nav-item"
        :class="{ active: $route.path === '/dashboard' }"
      >
        <div class="nav-icon">🏠</div>
        <span class="nav-label">首頁</span>
      </router-link>

      <router-link 
        to="/search" 
        class="nav-item"
        :class="{ active: $route.path.startsWith('/search') }"
      >
        <div class="nav-icon">🔍</div>
        <span class="nav-label">搜尋</span>
      </router-link>

      <router-link 
        to="/playlists" 
        class="nav-item"
        :class="{ active: $route.path.startsWith('/playlists') }"
      >
        <div class="nav-icon">📋</div>
        <span class="nav-label">播放清單</span>
      </router-link>

      <router-link 
        to="/library" 
        class="nav-item"
        :class="{ active: $route.path.startsWith('/library') }"
      >
        <div class="nav-icon">📚</div>
        <span class="nav-label">資料庫</span>
      </router-link>

      <router-link 
        to="/profile" 
        class="nav-item"
        :class="{ active: $route.path.startsWith('/profile') }"
      >
        <div class="nav-icon">👤</div>
        <span class="nav-label">個人</span>
      </router-link>
    </div>
  </nav>
</template>

<script setup lang="ts">
import { useBreakpoints } from '@/composables/useBreakpoints'

const { isMobile } = useBreakpoints()
</script>

<style lang="scss" scoped>
@import '@/styles/responsive.scss';

.mobile-nav {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: var(--bg-primary, #ffffff);
  border-top: 1px solid var(--border-color, #e5e7eb);
  padding: 8px 0 calc(8px + env(safe-area-inset-bottom));
  z-index: 999;
  box-shadow: 0 -2px 12px rgba(0, 0, 0, 0.08);

  // 確保在播放器下方
  @media (max-width: 767px) {
    bottom: 0;
    
    // 當有播放器時調整位置
    &.with-player {
      bottom: 80px;
    }
  }
}

.nav-container {
  display: flex;
  justify-content: space-around;
  align-items: center;
  max-width: 100%;
  margin: 0 auto;
  padding: 0 8px;
}

.nav-item {
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  padding: 8px 12px;
  text-decoration: none;
  color: var(--text-secondary, #6b7280);
  transition: all 0.2s ease;
  border-radius: 12px;
  min-width: 44px;
  min-height: 44px;
  position: relative;

  // 觸控回饋
  &:active {
    transform: scale(0.95);
    background: var(--bg-hover, rgba(0, 0, 0, 0.05));
  }

  &.active {
    color: var(--primary-color, #3b82f6);
    background: var(--primary-color-light, rgba(59, 130, 246, 0.1));

    .nav-icon {
      transform: scale(1.1);
    }

    // 活躍指示器
    &::before {
      content: '';
      position: absolute;
      top: -2px;
      left: 50%;
      transform: translateX(-50%);
      width: 20px;
      height: 3px;
      background: var(--primary-color, #3b82f6);
      border-radius: 0 0 2px 2px;
    }
  }

  // 懸停效果（針對支援懸停的設備）
  @media (hover: hover) {
    &:hover:not(.active) {
      color: var(--text-primary, #1f2937);
      background: var(--bg-hover, rgba(0, 0, 0, 0.05));
    }
  }
}

.nav-icon {
  font-size: 20px;
  margin-bottom: 4px;
  transition: transform 0.2s ease;
  line-height: 1;
}

.nav-label {
  font-size: 11px;
  font-weight: 500;
  line-height: 1;
  text-align: center;
  white-space: nowrap;
  max-width: 60px;
  overflow: hidden;
  text-overflow: ellipsis;
}

// 深色主題適配
@media (prefers-color-scheme: dark) {
  .mobile-nav {
    background: var(--bg-primary-dark, #1f2937);
    border-top-color: var(--border-color-dark, #374151);
  }

  .nav-item {
    color: var(--text-secondary-dark, #9ca3af);

    &:active {
      background: var(--bg-hover-dark, rgba(255, 255, 255, 0.1));
    }

    &.active {
      color: var(--primary-color, #3b82f6);
      background: var(--primary-color-light-dark, rgba(59, 130, 246, 0.2));
    }

    @media (hover: hover) {
      &:hover:not(.active) {
        color: var(--text-primary-dark, #f9fafb);
        background: var(--bg-hover-dark, rgba(255, 255, 255, 0.1));
      }
    }
  }
}

// 平板橫向時隱藏
@include respond-to(md) {
  .mobile-nav {
    display: none;
  }
}

// 安全區域適配
@supports (padding: max(0px)) {
  .mobile-nav {
    padding-bottom: max(8px, env(safe-area-inset-bottom));
  }
}

// 減少動畫效果（使用者偏好）
@media (prefers-reduced-motion: reduce) {
  .nav-item,
  .nav-icon {
    transition: none !important;
  }

  .nav-item:active {
    transform: none !important;
  }
}

// 高對比度模式適配
@media (prefers-contrast: high) {
  .mobile-nav {
    border-top-width: 2px;
  }

  .nav-item.active::before {
    height: 4px;
  }
}

// 針對不同螢幕尺寸的調整
@media (max-width: 360px) {
  .nav-container {
    padding: 0 4px;
  }

  .nav-item {
    padding: 6px 8px;
    min-width: 40px;
    min-height: 40px;
  }

  .nav-icon {
    font-size: 18px;
  }

  .nav-label {
    font-size: 10px;
    max-width: 50px;
  }
}

@media (min-width: 500px) and (max-width: 767px) {
  .nav-container {
    max-width: 480px;
  }

  .nav-item {
    padding: 10px 16px;
  }

  .nav-icon {
    font-size: 22px;
    margin-bottom: 6px;
  }

  .nav-label {
    font-size: 12px;
  }
}

// 通知徽章樣式（未來擴展用）
.nav-item {
  .badge {
    position: absolute;
    top: 4px;
    right: 8px;
    background: var(--error-color, #ef4444);
    color: white;
    font-size: 10px;
    font-weight: 600;
    padding: 2px 6px;
    border-radius: 10px;
    min-width: 16px;
    height: 16px;
    display: flex;
    align-items: center;
    justify-content: center;
    line-height: 1;
  }
}
</style>