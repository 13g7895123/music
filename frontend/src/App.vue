<template>
  <div id="app">
    <nav class="navbar">
      <div class="nav-container">
        <router-link
          to="/"
          class="nav-brand"
        >
          <img
            src="@/assets/images/icon.png"
            alt="YouTube Loop Player"
            class="brand-icon-img"
          >
          <span class="brand-text">YouTube Loop Player</span>
        </router-link>
        <div class="nav-right">
          <div class="nav-links">
            <router-link
              to="/"
              class="nav-link"
            >
              播放器
            </router-link>
            <router-link
              v-if="authStore.isAuthenticated"
              to="/library"
              class="nav-link"
            >
              影片庫
            </router-link>
            <router-link
              v-if="authStore.isAuthenticated"
              to="/playlists"
              class="nav-link"
            >
              播放清單
            </router-link>
          </div>
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
import { onMounted } from 'vue'
import FloatingPlayer from '@/components/FloatingPlayer.vue'
import Toast from '@/components/Toast.vue'
import UserMenu from '@/components/UserMenu.vue'
import { useAuthStore } from '@/stores/auth'

const authStore = useAuthStore()

onMounted(async () => {
  await authStore.checkAuth()
})
</script>

<style>
* {
  margin: 0;
  padding: 0;
  box-sizing: border-box;
}

#app {
  min-height: 100vh;
  font-family: var(--font-family-base);
  color: var(--text-primary);
  background-color: var(--cream-100);
  background-image: var(--page-glow);
  background-attachment: fixed;
  background-repeat: no-repeat;
}

/* ===== Navbar ===== */
.navbar {
  position: sticky;
  top: 0;
  z-index: var(--z-sticky);
  background: rgba(253, 248, 240, 0.78);
  backdrop-filter: blur(18px) saturate(150%);
  -webkit-backdrop-filter: blur(18px) saturate(150%);
  border-bottom: 1px solid rgba(235, 223, 204, 0.9);
}

.nav-container {
  max-width: 1200px;
  margin: 0 auto;
  padding: var(--space-3) var(--space-5);
  display: flex;
  justify-content: space-between;
  align-items: center;
  gap: var(--space-4);
}

.nav-brand {
  display: flex;
  align-items: center;
  gap: var(--space-2);
  flex-shrink: 0;
  font-size: 1.25rem;
  font-weight: 800;
  letter-spacing: -0.02em;
  text-decoration: none;
  color: var(--ink-900);
  transition: color var(--transition-fast);
}

.nav-brand:hover {
  color: var(--amber-600);
}

.brand-icon-img {
  width: 32px;
  height: 32px;
  object-fit: contain;
  border-radius: 10px;
  flex-shrink: 0;
}

.nav-right {
  display: flex;
  align-items: center;
  gap: var(--space-4);
  flex-shrink: 0;
}

.nav-links {
  display: flex;
  gap: var(--space-1);
}

.nav-link {
  padding: var(--space-2) var(--space-4);
  border-radius: var(--radius-full);
  font-size: 0.9375rem;
  font-weight: 600;
  text-decoration: none;
  color: var(--ink-500);
  transition: background var(--transition-fast), color var(--transition-fast);
}

.nav-link:hover {
  background: var(--cream-300);
  color: var(--ink-900);
}

.nav-link.router-link-active {
  color: var(--amber-700);
  background: rgba(224, 141, 90, 0.14);
}

@media (max-width: 768px) {
  .nav-container {
    flex-wrap: wrap;
    gap: var(--space-2);
    padding: var(--space-2) var(--space-3);
  }

  .nav-brand {
    font-size: 1.125rem;
  }

  .brand-icon-img {
    width: 28px;
    height: 28px;
  }

  .brand-text {
    display: none;
  }

  .nav-right {
    gap: var(--space-2);
  }

  .nav-link {
    padding: var(--space-2) var(--space-3);
    font-size: 0.875rem;
  }
}
</style>
