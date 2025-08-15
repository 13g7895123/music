import { createRouter, createWebHistory } from 'vue-router'
import { authGuard, guestGuard } from './guards'
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
    // 默認重導向到首頁
    {
      path: '/:pathMatch(.*)*',
      redirect: '/'
    }
  ]
})

export default router