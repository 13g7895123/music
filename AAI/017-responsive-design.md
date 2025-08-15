# Story 17: 響應式設計

## 📋 基本資訊
- **Story ID**: YMP-017
- **Epic**: 系統完善
- **優先級**: Should Have (P1)
- **預估點數**: 8 points
- **預估時間**: 2 天
- **依賴關係**: Story 16
- **Git Repository**: https://github.com/13g7895123/music.git

## 🎯 用戶故事
**身為** 使用者  
**我希望** 應用程式在各種裝置和螢幕尺寸上都能正常運作  
**以便** 在手機、平板、電腦上都有良好的使用體驗

## 📝 詳細需求

### 核心功能需求
1. **行動優先設計**: Mobile-first responsive design
2. **彈性佈局**: 適應不同螢幕尺寸的佈局
3. **觸控友善**: 手機觸控操作優化
4. **適應性字體**: 可讀性在所有裝置上良好
5. **效能優化**: 在低效能裝置上流暢運行

### 技術規格

**響應式佈局系統**:
```scss
// frontend/src/styles/responsive.scss
// 斷點定義
$breakpoints: (
  xs: 0,
  sm: 576px,
  md: 768px,
  lg: 992px,
  xl: 1200px,
  xxl: 1400px
);

// 響應式 mixin
@mixin respond-to($breakpoint) {
  @if map-has-key($breakpoints, $breakpoint) {
    @media (min-width: map-get($breakpoints, $breakpoint)) {
      @content;
    }
  }
}

// 字體大小系統
$font-sizes: (
  xs: 0.75rem,    // 12px
  sm: 0.875rem,   // 14px
  base: 1rem,     // 16px
  lg: 1.125rem,   // 18px
  xl: 1.25rem,    // 20px
  2xl: 1.5rem,    // 24px
  3xl: 1.875rem,  // 30px
  4xl: 2.25rem,   // 36px
);

// 間距系統
$spacing: (
  0: 0,
  1: 0.25rem,    // 4px
  2: 0.5rem,     // 8px
  3: 0.75rem,    // 12px
  4: 1rem,       // 16px
  5: 1.25rem,    // 20px
  6: 1.5rem,     // 24px
  8: 2rem,       // 32px
  10: 2.5rem,    // 40px
  12: 3rem,      // 48px
  16: 4rem,      // 64px
);

// 容器類別
.container {
  width: 100%;
  margin: 0 auto;
  padding: 0 1rem;

  @include respond-to(sm) {
    max-width: 540px;
  }

  @include respond-to(md) {
    max-width: 720px;
  }

  @include respond-to(lg) {
    max-width: 960px;
  }

  @include respond-to(xl) {
    max-width: 1140px;
  }

  @include respond-to(xxl) {
    max-width: 1320px;
  }
}

// 網格系統
.row {
  display: flex;
  flex-wrap: wrap;
  margin: 0 -0.5rem;
}

.col {
  flex: 1;
  padding: 0 0.5rem;
}

@for $i from 1 through 12 {
  .col-#{$i} {
    flex: 0 0 percentage($i / 12);
    max-width: percentage($i / 12);
    padding: 0 0.5rem;
  }

  @include respond-to(sm) {
    .col-sm-#{$i} {
      flex: 0 0 percentage($i / 12);
      max-width: percentage($i / 12);
    }
  }

  @include respond-to(md) {
    .col-md-#{$i} {
      flex: 0 0 percentage($i / 12);
      max-width: percentage($i / 12);
    }
  }

  @include respond-to(lg) {
    .col-lg-#{$i} {
      flex: 0 0 percentage($i / 12);
      max-width: percentage($i / 12);
    }
  }
}

// 工具類別
.d-none {
  display: none !important;
}

.d-block {
  display: block !important;
}

.d-flex {
  display: flex !important;
}

@include respond-to(sm) {
  .d-sm-none { display: none !important; }
  .d-sm-block { display: block !important; }
  .d-sm-flex { display: flex !important; }
}

@include respond-to(md) {
  .d-md-none { display: none !important; }
  .d-md-block { display: block !important; }
  .d-md-flex { display: flex !important; }
}

@include respond-to(lg) {
  .d-lg-none { display: none !important; }
  .d-lg-block { display: block !important; }
  .d-lg-flex { display: flex !important; }
}
```

**響應式組件示例**:
```vue
<!-- frontend/src/components/layout/AppLayout.vue -->
<template>
  <div class="app-layout" :class="{ 'mobile-layout': isMobile }">
    <!-- 側邊欄 -->
    <nav 
      class="sidebar"
      :class="{ 
        'sidebar-open': sidebarOpen,
        'sidebar-mobile': isMobile 
      }"
    >
      <div class="sidebar-header">
        <h1 class="app-title">MyTune</h1>
        <button
          v-if="isMobile"
          @click="closeSidebar"
          class="close-sidebar-btn"
        >
          ✕
        </button>
      </div>
      
      <div class="sidebar-content">
        <SidebarNav />
      </div>
    </nav>

    <!-- 主要內容區 -->
    <main class="main-content">
      <!-- 頂部導航 -->
      <header class="top-header">
        <button
          v-if="isMobile"
          @click="openSidebar"
          class="menu-toggle"
        >
          ☰
        </button>
        
        <div class="header-content">
          <SearchBar class="header-search" />
          <UserMenu class="header-user" />
        </div>
      </header>

      <!-- 內容區域 -->
      <div class="content-area">
        <router-view />
      </div>
    </main>

    <!-- 行動裝置底部導航 -->
    <nav v-if="isMobile" class="bottom-nav">
      <router-link to="/dashboard" class="nav-item">
        <i class="nav-icon">🏠</i>
        <span class="nav-label">首頁</span>
      </router-link>
      <router-link to="/playlists" class="nav-item">
        <i class="nav-icon">📋</i>
        <span class="nav-label">播放清單</span>
      </router-link>
      <router-link to="/search" class="nav-item">
        <i class="nav-icon">🔍</i>
        <span class="nav-label">搜尋</span>
      </router-link>
      <router-link to="/profile" class="nav-item">
        <i class="nav-icon">👤</i>
        <span class="nav-label">個人</span>
      </router-link>
    </nav>

    <!-- 側邊欄遮罩 (行動裝置) -->
    <div
      v-if="isMobile && sidebarOpen"
      class="sidebar-overlay"
      @click="closeSidebar"
    ></div>

    <!-- 播放器欄 -->
    <PlayerBar />
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted } from 'vue'
import { useBreakpoints } from '@/composables/useBreakpoints'
import SidebarNav from './SidebarNav.vue'
import SearchBar from './SearchBar.vue'
import UserMenu from './UserMenu.vue'
import PlayerBar from './PlayerBar.vue'

const { isMobile, isTablet, isDesktop } = useBreakpoints()
const sidebarOpen = ref(false)

const openSidebar = () => {
  sidebarOpen.value = true
  if (isMobile.value) {
    document.body.style.overflow = 'hidden'
  }
}

const closeSidebar = () => {
  sidebarOpen.value = false
  document.body.style.overflow = ''
}

// 螢幕尺寸變化時自動調整側邊欄
watch(isMobile, (newValue) => {
  if (!newValue && sidebarOpen.value) {
    closeSidebar()
  }
})
</script>

<style lang="scss" scoped>
@import '@/styles/responsive.scss';

.app-layout {
  display: flex;
  min-height: 100vh;
  background: var(--bg-primary);
}

.sidebar {
  width: 280px;
  background: var(--bg-secondary);
  border-right: 1px solid var(--border-color);
  transition: transform 0.3s ease;
  
  @include respond-to(lg) {
    position: relative;
    transform: none !important;
  }
}

.sidebar-mobile {
  position: fixed;
  top: 0;
  left: 0;
  height: 100vh;
  z-index: 1000;
  transform: translateX(-100%);
  
  &.sidebar-open {
    transform: translateX(0);
  }
}

.main-content {
  flex: 1;
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.top-header {
  display: flex;
  align-items: center;
  padding: 1rem;
  background: var(--bg-primary);
  border-bottom: 1px solid var(--border-color);
  
  @include respond-to(lg) {
    padding: 1rem 2rem;
  }
}

.menu-toggle {
  background: none;
  border: none;
  font-size: 1.5rem;
  margin-right: 1rem;
  cursor: pointer;
}

.header-content {
  display: flex;
  align-items: center;
  justify-content: space-between;
  flex: 1;
}

.content-area {
  flex: 1;
  padding: 1rem;
  padding-bottom: 100px; // 為播放器欄留空間
  
  @include respond-to(md) {
    padding: 2rem;
  }
  
  @include respond-to(lg) {
    padding-bottom: 80px;
  }
}

.bottom-nav {
  position: fixed;
  bottom: 0;
  left: 0;
  right: 0;
  background: var(--bg-secondary);
  border-top: 1px solid var(--border-color);
  display: flex;
  padding: 0.5rem 0;
  z-index: 999;
  
  @include respond-to(lg) {
    display: none;
  }
}

.nav-item {
  flex: 1;
  display: flex;
  flex-direction: column;
  align-items: center;
  padding: 0.5rem;
  text-decoration: none;
  color: var(--text-secondary);
  transition: color 0.2s;
  
  &.router-link-active {
    color: var(--primary-color);
  }
}

.nav-icon {
  font-size: 1.2rem;
  margin-bottom: 0.25rem;
}

.nav-label {
  font-size: 0.75rem;
}

.sidebar-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  z-index: 999;
}

.mobile-layout {
  .main-content {
    margin-bottom: 60px; // 底部導航高度
  }
  
  .content-area {
    padding-bottom: 160px; // 底部導航 + 播放器欄
  }
}
</style>
```

## 🗂️ 檔案位置和結構

**新建檔案**:
- `frontend/src/styles/responsive.scss` - 響應式樣式系統
- `frontend/src/composables/useBreakpoints.ts` - 螢幕尺寸偵測
- `frontend/src/styles/mobile.scss` - 行動裝置專用樣式
- `frontend/src/components/layout/MobileNav.vue` - 行動裝置導航

**更新檔案**:
- `frontend/src/App.vue` - 集成響應式佈局
- `frontend/src/styles/main.scss` - 主要樣式檔案
- 所有現有組件 - 添加響應式樣式

## ✅ 驗收條件

### 功能驗收
- [ ] 在手機、平板、電腦上正常顯示
- [ ] 觸控操作響應良好
- [ ] 側邊欄在行動裝置上正確摺疊
- [ ] 底部導航在小螢幕上顯示
- [ ] 所有互動元素適合觸控

### 視覺驗收
- [ ] 文字在所有裝置上清晰可讀
- [ ] 按鈕大小適合觸控操作
- [ ] 間距在不同螢幕上協調
- [ ] 圖片和媒體正確縮放

### 效能驗收
- [ ] 在低效能裝置上流暢運行
- [ ] CSS檔案大小合理
- [ ] 載入時間在可接受範圍

## 🚀 實作指引

### Step 1: 建立響應式樣式系統
建立SCSS變數和mixin

### Step 2: 重構現有組件
為所有組件添加響應式樣式

### Step 3: 建立行動裝置導航
實作底部導航和側邊欄

### Step 4: 測試各種裝置
在不同螢幕尺寸上測試

## 📊 預期成果
- ✅ 完美的跨裝置體驗
- ✅ 直觀的行動裝置操作
- ✅ 優化的觸控互動
- ✅ 一致的視覺體驗
- ✅ 優秀的效能表現