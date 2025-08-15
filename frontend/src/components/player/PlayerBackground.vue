<template>
  <div class="player-background">
    <!-- 動態漸層背景 -->
    <div 
      class="gradient-bg"
      :style="gradientStyle"
    ></div>
    
    <!-- 幾何圖形動畫 -->
    <div class="geometric-shapes">
      <div
        v-for="shape in shapes"
        :key="shape.id"
        class="shape"
        :class="shape.type"
        :style="shape.style"
      ></div>
    </div>
    
    <!-- 音波擴散效果 -->
    <div v-if="isPlaying" class="sound-waves">
      <div
        v-for="i in 6"
        :key="i"
        class="sound-wave"
        :style="getSoundWaveStyle(i)"
      ></div>
    </div>
    
    <!-- 顏色遮罩 -->
    <div class="color-overlay" :style="overlayStyle"></div>
    
    <!-- 紋理效果 -->
    <div class="texture-overlay"></div>
  </div>
</template>

<script setup lang="ts">
import { ref, computed, onMounted, onUnmounted, watch } from 'vue'

interface Shape {
  id: number
  type: 'circle' | 'triangle' | 'square'
  x: number
  y: number
  size: number
  rotation: number
  speed: number
  opacity: number
  color: string
  style: any
}

// Props
interface Props {
  currentSong?: any
  isPlaying?: boolean
  theme?: 'auto' | 'warm' | 'cool' | 'vibrant' | 'minimal'
}

const props = withDefaults(defineProps<Props>(), {
  isPlaying: false,
  theme: 'auto'
})

// Refs
const shapes = ref<Shape[]>([])
const animationId = ref<number | null>(null)
const time = ref(0)
const colorIndex = ref(0)

// 顏色主題配置
const themes = {
  warm: ['#ff9a9e', '#fecfef', '#fecfef'],
  cool: ['#a8e6cf', '#dcedc8', '#b2ebf2'],
  vibrant: ['#ff6b6b', '#4ecdc4', '#45b7d1', '#f39c12', '#9b59b6'],
  minimal: ['#2c3e50', '#34495e', '#7f8c8d'],
  auto: [] // 將根據歌曲動態生成
}

// 計算漸層樣式
const gradientStyle = computed(() => {
  const colors = getThemeColors()
  const angle = (time.value * 0.5) % 360
  
  return {
    background: `linear-gradient(${angle}deg, ${colors[0]}, ${colors[1]}, ${colors[2] || colors[0]})`,
    transform: `scale(${1 + Math.sin(time.value * 0.01) * 0.1})`,
    transition: 'background 2s ease-in-out'
  }
})

// 計算覆蓋層樣式
const overlayStyle = computed(() => {
  const opacity = props.isPlaying ? 0.6 + Math.sin(time.value * 0.02) * 0.1 : 0.8
  
  return {
    background: `radial-gradient(circle at center, transparent 30%, rgba(0, 0, 0, ${opacity}) 100%)`,
    opacity: 0.7
  }
})

// 獲取主題顏色
const getThemeColors = () => {
  if (props.theme === 'auto' && props.currentSong) {
    // 根據歌曲標題或藝術家生成顏色
    const songHash = hashString(props.currentSong.title || '')
    const colors = [
      `hsl(${(songHash * 137.508) % 360}, 70%, 60%)`,
      `hsl(${(songHash * 137.508 + 120) % 360}, 70%, 50%)`,
      `hsl(${(songHash * 137.508 + 240) % 360}, 70%, 55%)`
    ]
    return colors
  }
  
  return themes[props.theme] || themes.vibrant
}

// 簡單的字符串哈希函數
const hashString = (str: string): number => {
  let hash = 0
  for (let i = 0; i < str.length; i++) {
    const char = str.charCodeAt(i)
    hash = ((hash << 5) - hash) + char
    hash = hash & hash // 轉換為32位整數
  }
  return Math.abs(hash)
}

// 獲取音波樣式
const getSoundWaveStyle = (index: number) => {
  const delay = index * 0.5
  const scale = 1 + Math.sin(time.value * 0.03 + delay) * 0.5
  const opacity = Math.max(0.1, 0.8 - index * 0.1)
  
  return {
    transform: `scale(${scale})`,
    opacity: opacity,
    animationDelay: `${delay}s`,
    borderColor: getThemeColors()[index % 3]
  }
}

// 創建幾何圖形
const createShape = (): Shape => {
  const types: Shape['type'][] = ['circle', 'triangle', 'square']
  const colors = getThemeColors()
  
  return {
    id: Date.now() + Math.random(),
    type: types[Math.floor(Math.random() * types.length)],
    x: Math.random() * 100,
    y: Math.random() * 100,
    size: Math.random() * 60 + 20,
    rotation: 0,
    speed: Math.random() * 0.5 + 0.2,
    opacity: Math.random() * 0.3 + 0.1,
    color: colors[Math.floor(Math.random() * colors.length)],
    style: {}
  }
}

// 更新圖形位置和樣式
const updateShapes = () => {
  shapes.value.forEach(shape => {
    shape.rotation += shape.speed
    shape.y -= shape.speed * 0.1
    
    // 重置超出邊界的圖形
    if (shape.y < -10) {
      shape.y = 110
      shape.x = Math.random() * 100
    }
    
    const pulseScale = props.isPlaying ? 1 + Math.sin(time.value * 0.05 + shape.id) * 0.1 : 1
    
    shape.style = {
      left: `${shape.x}%`,
      top: `${shape.y}%`,
      width: `${shape.size}px`,
      height: `${shape.size}px`,
      transform: `rotate(${shape.rotation}deg) scale(${pulseScale})`,
      opacity: shape.opacity,
      background: shape.color,
      borderColor: shape.color
    }
  })
  
  // 添加新圖形
  if (shapes.value.length < 15 && Math.random() < 0.02) {
    shapes.value.push(createShape())
  }
  
  // 移除過多的圖形
  if (shapes.value.length > 20) {
    shapes.value.shift()
  }
}

// 動畫循環
const animate = () => {
  time.value++
  updateShapes()
  animationId.value = requestAnimationFrame(animate)
}

// 初始化圖形
const initShapes = () => {
  shapes.value = []
  for (let i = 0; i < 8; i++) {
    shapes.value.push(createShape())
  }
}

// 監聽歌曲變化
watch(() => props.currentSong, () => {
  colorIndex.value = (colorIndex.value + 1) % 5
  initShapes()
}, { deep: true })

onMounted(() => {
  initShapes()
  animate()
})

onUnmounted(() => {
  if (animationId.value) {
    cancelAnimationFrame(animationId.value)
  }
})
</script>

<style scoped>
.player-background {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  overflow: hidden;
  z-index: -1;
}

.gradient-bg {
  position: absolute;
  top: -10%;
  left: -10%;
  width: 120%;
  height: 120%;
  transition: all 3s ease-in-out;
}

.geometric-shapes {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  overflow: hidden;
}

.shape {
  position: absolute;
  transition: all 0.5s ease;
  pointer-events: none;
}

.shape.circle {
  border-radius: 50%;
  border: 2px solid transparent;
}

.shape.triangle {
  width: 0 !important;
  height: 0 !important;
  background: transparent !important;
  border-left: 20px solid transparent;
  border-right: 20px solid transparent;
  border-bottom: 35px solid;
  border-bottom-color: inherit;
}

.shape.square {
  border-radius: 8px;
  border: 2px solid transparent;
  transform-origin: center;
}

.sound-waves {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
}

.sound-wave {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 200px;
  height: 200px;
  border: 2px solid rgba(255, 255, 255, 0.3);
  border-radius: 50%;
  transform: translate(-50%, -50%);
  animation: sound-pulse 3s ease-out infinite;
}

@keyframes sound-pulse {
  0% {
    transform: translate(-50%, -50%) scale(0.5);
    opacity: 1;
  }
  100% {
    transform: translate(-50%, -50%) scale(2);
    opacity: 0;
  }
}

.color-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  transition: all 2s ease-in-out;
}

.texture-overlay {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  opacity: 0.1;
  background-image: 
    radial-gradient(circle at 20% 80%, rgba(255, 255, 255, 0.1) 0%, transparent 50%),
    radial-gradient(circle at 80% 20%, rgba(255, 255, 255, 0.1) 0%, transparent 50%),
    radial-gradient(circle at 40% 40%, rgba(255, 255, 255, 0.05) 0%, transparent 50%);
  animation: texture-float 20s ease-in-out infinite;
}

@keyframes texture-float {
  0%, 100% {
    transform: translateY(0) rotate(0deg);
  }
  50% {
    transform: translateY(-20px) rotate(180deg);
  }
}

/* 深色主題適配 */
@media (prefers-color-scheme: dark) {
  .texture-overlay {
    background-image: 
      radial-gradient(circle at 20% 80%, rgba(0, 0, 0, 0.2) 0%, transparent 50%),
      radial-gradient(circle at 80% 20%, rgba(0, 0, 0, 0.2) 0%, transparent 50%),
      radial-gradient(circle at 40% 40%, rgba(0, 0, 0, 0.1) 0%, transparent 50%);
  }
}

/* 響應式設計 */
@media (max-width: 768px) {
  .sound-wave {
    width: 150px;
    height: 150px;
  }
  
  .shape {
    transform: scale(0.8);
  }
}

@media (max-width: 480px) {
  .sound-wave {
    width: 100px;
    height: 100px;
  }
  
  .shape {
    transform: scale(0.6);
  }
  
  .gradient-bg {
    top: -5%;
    left: -5%;
    width: 110%;
    height: 110%;
  }
}

/* 減少動畫效果（用戶偏好） */
@media (prefers-reduced-motion: reduce) {
  .gradient-bg,
  .shape,
  .sound-wave,
  .color-overlay,
  .texture-overlay {
    animation: none !important;
    transition: none !important;
  }
  
  .sound-waves {
    display: none;
  }
}
</style>