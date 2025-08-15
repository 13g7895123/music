import { createRouter, createWebHistory } from 'vue-router'
import { authGuard, guestGuard } from './guards'
import { usePlayerStore } from '@/stores/player'
import Home from '../views/Home.vue'

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      name: 'Home',
      component: Home
    },
    {
      path: '/auth/login',
      name: 'Login',
      component: () => import('../views/auth/LoginView.vue'),
      beforeEnter: guestGuard
    },
    {
      path: '/auth/register',
      name: 'Register', 
      component: () => import('../views/auth/RegisterView.vue'),
      beforeEnter: guestGuard
    },
    {
      path: '/dashboard',
      name: 'Dashboard',
      component: () => import('../views/DashboardView.vue'),
      beforeEnter: authGuard
    },
    {
      path: '/playlists',
      name: 'Playlists',
      component: () => import('../views/PlaylistsView.vue'),
      beforeEnter: authGuard
    },
    {
      path: '/playlists/:id',
      name: 'PlaylistDetail',
      component: () => import('../views/PlaylistDetailView.vue'),
      beforeEnter: authGuard
    },
    {
      path: '/player',
      name: 'Player',
      component: () => import('../views/PlayerView.vue')
    },
    // 默認重導向到首頁
    {
      path: '/:pathMatch(.*)*',
      redirect: '/'
    }
  ]
})

// 路由守衛 - 狀態持久化
router.beforeEach((to, from, next) => {
  const playerStore = usePlayerStore()
  
  // 在路由切換時保存播放器狀態
  playerStore.saveToLocalStorage()
  
  next()
})

router.afterEach(() => {
  const playerStore = usePlayerStore()
  
  // 路由切換後確保播放器狀態同步
  setTimeout(() => {
    playerStore.loadFromLocalStorage()
  }, 100)
})

export default router