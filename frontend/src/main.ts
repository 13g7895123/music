import { createApp } from 'vue'
import App from './App.vue'
import router from './router'
import { createPinia } from 'pinia'
import { useAuthStore } from './stores/auth'
import './style.css'
import './styles/main.scss'

// 初始化錯誤處理器
import './utils/errorHandler'

const app = createApp(App)
const pinia = createPinia()

app.use(pinia)
app.use(router)

// 初始化認證狀態
const authStore = useAuthStore()
authStore.initializeAuth()

app.mount('#app')