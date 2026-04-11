<template>
  <div id="app" :data-theme="isV2 ? 'v2' : undefined" :class="{ 'theme-v2': isV2 }">
    <nav class="navbar" :class="{ 'navbar-v2': isV2 }">
      <div class="nav-container">
        <router-link to="/" class="nav-brand">
          <img src="@/assets/images/icon.png" alt="YouTube Loop Player" class="brand-icon-img" />
          <span class="brand-text">YouTube Loop Player</span>
        </router-link>
        <div class="nav-right">
          <div class="nav-links">
            <router-link to="/" class="nav-link">播放器</router-link>
            <router-link v-if="authStore.isAuthenticated" to="/library" class="nav-link">影片庫</router-link>
            <router-link v-if="authStore.isAuthenticated" to="/playlists" class="nav-link">播放清單</router-link>
          </div>
          <ThemeToggle />
          <UserMenu />
        </div>
      </div>
    </nav>
    <router-view />
    <FloatingPlayer />
    <Toast />
  </div>
</template>

<script setup>
import { onMounted, ref, provide, watch } from 'vue'
import FloatingPlayer from '@/components/FloatingPlayer.vue'
import Toast from '@/components/Toast.vue'
import UserMenu from '@/components/UserMenu.vue'
import ThemeToggle from '@/components/ThemeToggle.vue'
import { useAuthStore } from '@/stores/auth'
import { useLocalStorage } from '@/composables/useLocalStorage'

const authStore = useAuthStore()
const themeStorage = useLocalStorage('yt-loop-theme', 'v2')
const isV2 = ref(themeStorage.value === 'v2')

function toggle() {
  isV2.value = !isV2.value
  themeStorage.value = isV2.value ? 'v2' : 'v1'
}

provide('theme', { isV2, toggle })

// 同步 body 的 data-theme，讓 Teleport 元件（Toast 等）也能繼承主題
watch(isV2, (v2) => {
  if (v2) {
    document.body.setAttribute('data-theme', 'v2')
  } else {
    document.body.removeAttribute('data-theme')
  }
}, { immediate: true })

onMounted(async () => {
  await authStore.checkAuth()
})
</script>

<style>
/* 全局樣式 */
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

/* V2 Inter 字體 */
.theme-v2 {
  font-family: 'Inter', -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif;
}

#app {
  min-height: 100vh;
  background: var(--bg-primary, #ffffff);
  transition: background 200ms ease, color 200ms ease;
}

/* ===== Navbar 基礎樣式 ===== */
.navbar {
  background: #ffffff;
  box-shadow: 0 2px 8px rgba(0, 0, 0, 0.1);
  position: sticky;
  top: 0;
  z-index: 100;
}

.nav-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: 0.75rem 1rem;
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: 1rem;
}

.nav-brand {
  font-size: 1.25rem;
  font-weight: 700;
  text-decoration: none;
  color: #212121;
  display: flex;
  align-items: center;
  gap: 0.5rem;
  transition: all 0.2s;
  flex-shrink: 0;
}

.nav-brand:hover {
  color: #ff0000;
}

.brand-icon-img {
  width: 32px;
  height: 32px;
  object-fit: contain;
  flex-shrink: 0;
}

.brand-text {
  display: inline;
}

.nav-right {
  display: flex;
  align-items: center;
  gap: 1rem;
  flex-shrink: 0;
}

.nav-links {
  display: flex;
  gap: 0.5rem;
}

.nav-link {
  text-decoration: none;
  color: #616161;
  font-weight: 500;
  padding: 0.5rem 0.875rem;
  border-radius: var(--radius-md);
  transition: all 0.2s;
  font-size: 0.9375rem;
}

.nav-link:hover {
  background: #f5f5f5;
  color: #212121;
}

.nav-link.router-link-active {
  color: #ff0000;
  background: #ffebee;
}

/* ===== Navbar V2 樣式覆蓋 ===== */
.navbar-v2 {
  background: rgba(10, 10, 15, 0.85) !important;
  backdrop-filter: blur(20px) saturate(180%);
  -webkit-backdrop-filter: blur(20px) saturate(180%);
  box-shadow: none !important;
  border-bottom: 1px solid rgba(255, 255, 255, 0.06);
}

.navbar-v2 .nav-brand {
  color: #F1F5F9;
}

.navbar-v2 .nav-brand:hover {
  color: #FF3B3B;
}

.navbar-v2 .nav-link {
  color: #94A3B8;
}

.navbar-v2 .nav-link:hover {
  background: rgba(255, 255, 255, 0.06);
  color: #F1F5F9;
}

.navbar-v2 .nav-link.router-link-active {
  color: #FF3B3B;
  background: rgba(255, 59, 59, 0.12);
}

/* 響應式設計 */
@media (max-width: 768px) {
  .nav-container {
    flex-wrap: wrap;
    gap: 0.5rem;
    padding: 0.625rem 0.875rem;
  }

  .nav-brand {
    font-size: 1.125rem;
    flex-basis: auto;
  }

  .brand-icon-img {
    width: 28px;
    height: 28px;
  }

  .brand-text {
    display: none;
  }

  .nav-right {
    gap: 0.5rem;
  }

  .nav-links {
    gap: 0.25rem;
  }

  .nav-link {
    padding: 0.5rem 0.625rem;
    font-size: 0.875rem;
  }
}

@media (max-width: 480px) {
  .nav-link {
    padding: 0.5rem;
    font-size: 0.8125rem;
  }
}
</style>
