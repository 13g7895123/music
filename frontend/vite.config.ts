import { defineConfig } from 'vite'
import vue from '@vitejs/plugin-vue'
import { resolve } from 'path'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [vue()],
  
  // 建置優化
  build: {
    target: 'es2015',
    outDir: 'dist',
    sourcemap: false, // 生產環境關閉 sourcemap
    minify: 'terser',
    terserOptions: {
      compress: {
        drop_console: true,
        drop_debugger: true,
        pure_funcs: ['console.log', 'console.info', 'console.debug']
      }
    },
    
    // 代碼分割
    rollupOptions: {
      output: {
        manualChunks: (id) => {
          // 第三方庫分離
          if (id.includes('node_modules')) {
            if (id.includes('vue') || id.includes('pinia') || id.includes('vue-router')) {
              return 'vendor'
            }
            if (id.includes('chart') || id.includes('echarts')) {
              return 'charts'
            }
            return 'vendor'
          }
          
          // 按功能分組
          if (id.includes('/views/auth/') || id.includes('/stores/auth')) {
            return 'auth'
          }
          if (id.includes('/components/player/') || id.includes('/stores/player')) {
            return 'player'
          }
          if (id.includes('/views/playlist') || id.includes('/stores/playlist')) {
            return 'playlist'
          }
        },
        chunkFileNames: (chunkInfo) => {
          const facadeModuleId = chunkInfo.facadeModuleId
          if (facadeModuleId) {
            const fileName = facadeModuleId.split('/').pop()?.replace('.vue', '') || 'chunk'
            return `js/${fileName}-[hash].js`
          }
          return 'js/[name]-[hash].js'
        },
        entryFileNames: 'js/[name]-[hash].js',
        assetFileNames: (assetInfo) => {
          const info = assetInfo.name?.split('.') || []
          const extType = info[info.length - 1]
          if (/\.(mp4|webm|ogg|mp3|wav|flac|aac)(\?.*)?$/i.test(assetInfo.name || '')) {
            return `media/[name]-[hash][extname]`
          }
          if (/\.(png|jpe?g|gif|svg|webp|ico)(\?.*)?$/i.test(assetInfo.name || '')) {
            return `img/[name]-[hash][extname]`
          }
          if (/\.(woff2?|eot|ttf|otf)(\?.*)?$/i.test(assetInfo.name || '')) {
            return `fonts/[name]-[hash][extname]`
          }
          return `assets/[name]-[hash][extname]`
        }
      }
    },
    
    // Chunk 大小警告
    chunkSizeWarningLimit: 1000,
    
    // 壓縮選項
    cssCodeSplit: true,
    assetsInlineLimit: 4096 // 4kb 以下的資源內聯為 base64
  },
  
  // 開發伺服器優化
  server: {
    port: 5173,
    host: '0.0.0.0',
    open: false,
    hmr: {
      overlay: false
    },
    watch: {
      usePolling: true
    }
  },
  
  // 別名設定
  resolve: {
    alias: {
      '@': resolve(__dirname, 'src')
    }
  },
  
  // CSS 優化
  css: {
    devSourcemap: false,
    preprocessorOptions: {
      scss: {
        additionalData: `@import "@/styles/variables.scss";`
      }
    }
  },
  
  // 依賴優化
  optimizeDeps: {
    include: ['vue', 'vue-router', 'pinia'],
    exclude: ['@vueuse/core']
  },
  
  // 測試配置
  test: {
    globals: true,
    environment: 'jsdom'
  }
})