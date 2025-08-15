import { createRouter, createWebHistory } from 'vue-router'
import { authGuard, guestGuard } from './guards'
import { usePlayerStore } from '@/stores/player'

// 延遲載入組件
const Home = () => import('../views/Home.vue')
const LoginView = () => import('../views/auth/LoginView.vue')
const RegisterView = () => import('../views/auth/RegisterView.vue')
const DashboardView = () => import('../views/DashboardView.vue')
const PlaylistsView = () => import('../views/PlaylistsView.vue')
const PlaylistDetailView = () => import('../views/PlaylistDetailView.vue')
const PlayerView = () => import('../views/PlayerView.vue')
const ProfileView = () => import('../views/ProfileView.vue')

const router = createRouter({
  history: createWebHistory(),
  routes: [
    {
      path: '/',
      name: 'Home',
      component: Home,
      meta: { 
        preload: true,
        title: '首頁'
      }
    },
    {
      path: '/auth/login',
      name: 'Login',
      component: LoginView,
      beforeEnter: guestGuard,
      meta: { 
        requiresGuest: true,
        preload: true,
        title: '登入'
      }
    },
    {
      path: '/auth/register',
      name: 'Register',
      component: RegisterView,
      beforeEnter: guestGuard,
      meta: { 
        requiresGuest: true,
        title: '註冊'
      }
    },
    {
      path: '/dashboard',
      name: 'Dashboard',
      component: DashboardView,
      beforeEnter: authGuard,
      meta: { 
        preload: true,
        title: '儀表板'
      }
    },
    {
      path: '/playlists',
      name: 'Playlists',
      component: PlaylistsView,
      beforeEnter: authGuard,
      meta: {
        title: '播放清單'
      }
    },
    {
      path: '/playlists/:id',
      name: 'PlaylistDetail',
      component: PlaylistDetailView,
      beforeEnter: authGuard,
      props: true,
      meta: {
        title: '播放清單詳情'
      }
    },
    {
      path: '/player',
      name: 'Player',
      component: PlayerView,
      meta: {
        title: '播放器'
      }
    },
    {
      path: '/profile',
      name: 'Profile',
      component: ProfileView,
      beforeEnter: authGuard,
      meta: {
        title: '個人資料'
      }
    },
    // 默認重導向到首頁
    {
      path: '/:pathMatch(.*)*',
      redirect: '/'
    }
  ]
})

// 預載入重要路由
router.beforeEach((to, from, next) => {
  const playerStore = usePlayerStore()
  
  // 在路由切換時保存播放器狀態
  playerStore.saveToLocalStorage()
  
  // 設置頁面標題
  if (to.meta.title) {
    document.title = `${to.meta.title} - YouTube Music Player`
  }
  
  // 預載入下一個可能訪問的頁面
  if (to.meta?.preload) {
    const nextRoutes = getNextLikelyRoutes(to.name as string)
    nextRoutes.forEach(routeName => {
      try {
        const route = router.resolve({ name: routeName })
        if (route.matched[0]?.components?.default) {
          // 預載入組件（異步進行，不阻塞導航）
          Promise.resolve(route.matched[0].components.default()).catch(() => {
            // 忽略預載入錯誤
          })
        }
      } catch (error) {
        // 忽略預載入錯誤
      }
    })
  }
  
  next()
})

router.afterEach(() => {
  const playerStore = usePlayerStore()
  
  // 路由切換後確保播放器狀態同步
  setTimeout(() => {
    playerStore.loadFromLocalStorage()
  }, 100)
})

function getNextLikelyRoutes(currentRoute: string): string[] {
  const routeMap: Record<string, string[]> = {
    'Home': ['Login', 'Dashboard'],
    'Login': ['Dashboard'],
    'Dashboard': ['Playlists', 'Player', 'Profile'],
    'Playlists': ['PlaylistDetail', 'Player'],
    'PlaylistDetail': ['Player'],
    'Player': ['Playlists']
  }
  return routeMap[currentRoute] || []
}

export default router