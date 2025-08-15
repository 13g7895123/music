<template>
  <div class="player-visualizer">
    <div class="visualizer-container">
      <!-- 音波視覺化 -->
      <div class="wave-visualizer">
        <div
          v-for="i in 32"
          :key="i"
          class="wave-bar"
          :style="getBarStyle(i)"
        ></div>
      </div>
      
      <!-- 圓形頻譜 -->
      <div class="circular-visualizer">
        <div
          v-for="i in 60"
          :key="i"
          class="frequency-bar"
          :style="getFrequencyBarStyle(i)"
        ></div>
      </div>
      
      <!-- 粒子效果 -->
      <div class="particle-container">
        <div
          v-for="particle in particles"
          :key="particle.id"
          class="particle"
          :style="particle.style"
        ></div>
      </div>
      
      <!-- 脈衝效果 -->
      <div class="pulse-container">
        <div
          v-for="i in 3"
          :key="i"
          class="pulse-ring"
          :style="getPulseStyle(i)"
        ></div>
      </div>
    </div>
  </div>
</template>

<script setup lang="ts">
import { ref, onMounted, onUnmounted, computed, watch } from 'vue'

interface Particle {
  id: number
  x: number
  y: number
  vx: number
  vy: number
  life: number
  maxLife: number
  size: number
  color: string
  style: any
}

// Props
interface Props {
  isPlaying?: boolean
  intensity?: number
  type?: 'wave' | 'circular' | 'particles' | 'all'
}

const props = withDefaults(defineProps<Props>(), {
  isPlaying: false,
  intensity: 1,
  type: 'all'
})

// Refs
const waveData = ref<number[]>(Array(32).fill(0))
const frequencyData = ref<number[]>(Array(60).fill(0))
const particles = ref<Particle[]>([])
const animationId = ref<number | null>(null)
const time = ref(0)

// Computed
const isActive = computed(() => props.isPlaying)

// 獲取波形條樣式
const getBarStyle = (index: number) => {
  const height = waveData.value[index - 1] || 0
  const hue = (index * 12 + time.value) % 360
  
  return {
    height: `${Math.max(2, height * props.intensity * 100)}%`,
    background: `hsl(${hue}, 70%, 60%)`,
    animationDelay: `${index * 0.05}s`,
    transform: `scaleY(${Math.max(0.1, height * props.intensity)})`
  }
}

// 獲取頻譜條樣式
const getFrequencyBarStyle = (index: number) => {
  const value = frequencyData.value[index - 1] || 0
  const angle = (index - 1) * 6 // 60 bars * 6 degrees = 360 degrees
  const length = Math.max(10, value * props.intensity * 80)
  const hue = (angle + time.value * 2) % 360
  
  return {
    transform: `rotate(${angle}deg) translateY(-50px)`,
    height: `${length}px`,
    background: `hsl(${hue}, 80%, 65%)`,
    opacity: Math.max(0.3, value * props.intensity)
  }
}

// 獲取脈衝樣式
const getPulseStyle = (index: number) => {
  const delay = index * 0.3
  const scale = 1 + Math.sin(time.value * 0.01 + delay) * 0.3 * props.intensity
  const opacity = Math.max(0.1, 0.4 - index * 0.1)
  
  return {
    transform: `scale(${scale})`,
    opacity: opacity,
    animationDelay: `${delay}s`
  }
}

// 生成隨機音頻數據（模擬音頻分析）
const generateAudioData = () => {
  if (!isActive.value) {
    // 當不播放時，逐漸減少到0
    waveData.value = waveData.value.map(value => Math.max(0, value - 0.05))
    frequencyData.value = frequencyData.value.map(value => Math.max(0, value - 0.05))
    return
  }
  
  // 模擬音頻數據
  const bassIntensity = Math.random() * 0.8 + 0.2
  const midIntensity = Math.random() * 0.6 + 0.3
  const highIntensity = Math.random() * 0.4 + 0.2
  
  // 更新波形數據
  waveData.value = waveData.value.map((_, index) => {
    const frequency = index / 32
    let intensity
    
    if (frequency < 0.3) {
      intensity = bassIntensity
    } else if (frequency < 0.7) {
      intensity = midIntensity
    } else {
      intensity = highIntensity
    }
    
    return Math.random() * intensity + Math.sin(time.value * 0.01 + index) * 0.2
  })
  
  // 更新頻譜數據
  frequencyData.value = frequencyData.value.map((_, index) => {
    const frequency = index / 60
    let intensity
    
    if (frequency < 0.2) {
      intensity = bassIntensity * 0.8
    } else if (frequency < 0.6) {
      intensity = midIntensity * 0.6
    } else {
      intensity = highIntensity * 0.4
    }
    
    return Math.random() * intensity + Math.sin(time.value * 0.005 + index * 0.1) * 0.15
  })
}

// 更新粒子
const updateParticles = () => {
  if (isActive.value && Math.random() < 0.3 * props.intensity) {
    // 創建新粒子
    const particle: Particle = {
      id: Date.now() + Math.random(),
      x: Math.random() * 100,
      y: Math.random() * 100,
      vx: (Math.random() - 0.5) * 2,
      vy: (Math.random() - 0.5) * 2,
      life: 0,
      maxLife: 100 + Math.random() * 100,
      size: Math.random() * 3 + 1,
      color: `hsl(${Math.random() * 360}, 70%, 60%)`,
      style: {}
    }
    
    particles.value.push(particle)
  }
  
  // 更新現有粒子
  particles.value = particles.value.filter(particle => {
    particle.life++
    particle.x += particle.vx
    particle.y += particle.vy
    particle.vx *= 0.98
    particle.vy *= 0.98
    
    const opacity = Math.max(0, 1 - particle.life / particle.maxLife)
    
    particle.style = {
      left: `${particle.x}%`,
      top: `${particle.y}%`,
      width: `${particle.size}px`,
      height: `${particle.size}px`,
      background: particle.color,
      opacity: opacity,
      transform: `scale(${opacity})`
    }
    
    return particle.life < particle.maxLife && 
           particle.x >= -10 && particle.x <= 110 && 
           particle.y >= -10 && particle.y <= 110
  })
}

// 動畫循環
const animate = () => {
  time.value++
  
  generateAudioData()
  updateParticles()
  
  animationId.value = requestAnimationFrame(animate)
}

// 監聽播放狀態變化
watch(() => props.isPlaying, (newValue) => {
  if (newValue && !animationId.value) {
    animate()
  } else if (!newValue) {
    // 繼續動畫但降低強度
  }
})

onMounted(() => {
  animate()
})

onUnmounted(() => {
  if (animationId.value) {
    cancelAnimationFrame(animationId.value)
  }
})
</script>

<style scoped>
.player-visualizer {
  position: relative;
  width: 100%;
  height: 100%;
  overflow: hidden;
  border-radius: inherit;
}

.visualizer-container {
  position: relative;
  width: 100%;
  height: 100%;
  display: flex;
  align-items: center;
  justify-content: center;
}

/* 波形視覺化 */
.wave-visualizer {
  position: absolute;
  bottom: 20px;
  left: 50%;
  transform: translateX(-50%);
  display: flex;
  align-items: flex-end;
  gap: 2px;
  height: 60px;
}

.wave-bar {
  width: 3px;
  min-height: 2px;
  border-radius: 1.5px;
  transition: all 0.1s ease;
  animation: wave-pulse 1.5s ease-in-out infinite;
}

@keyframes wave-pulse {
  0%, 100% {
    opacity: 0.7;
  }
  50% {
    opacity: 1;
  }
}

/* 圓形頻譜 */
.circular-visualizer {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
  width: 120px;
  height: 120px;
}

.frequency-bar {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 2px;
  min-height: 10px;
  background: white;
  border-radius: 1px;
  transform-origin: 0 0;
  transition: all 0.1s ease;
  animation: frequency-glow 2s ease-in-out infinite;
}

@keyframes frequency-glow {
  0%, 100% {
    box-shadow: 0 0 4px currentColor;
  }
  50% {
    box-shadow: 0 0 8px currentColor, 0 0 12px currentColor;
  }
}

/* 粒子效果 */
.particle-container {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
}

.particle {
  position: absolute;
  border-radius: 50%;
  pointer-events: none;
  animation: particle-float 3s ease-out infinite;
}

@keyframes particle-float {
  0% {
    transform: scale(0) rotate(0deg);
  }
  50% {
    transform: scale(1) rotate(180deg);
  }
  100% {
    transform: scale(0) rotate(360deg);
  }
}

/* 脈衝效果 */
.pulse-container {
  position: absolute;
  top: 50%;
  left: 50%;
  transform: translate(-50%, -50%);
}

.pulse-ring {
  position: absolute;
  top: 50%;
  left: 50%;
  width: 100px;
  height: 100px;
  border: 2px solid rgba(255, 255, 255, 0.5);
  border-radius: 50%;
  transform: translate(-50%, -50%);
  animation: pulse 2s ease-in-out infinite;
}

@keyframes pulse {
  0% {
    transform: translate(-50%, -50%) scale(0.8);
    opacity: 1;
  }
  100% {
    transform: translate(-50%, -50%) scale(1.5);
    opacity: 0;
  }
}

/* 響應式設計 */
@media (max-width: 768px) {
  .wave-visualizer {
    height: 40px;
    gap: 1px;
  }
  
  .wave-bar {
    width: 2px;
  }
  
  .circular-visualizer {
    width: 80px;
    height: 80px;
  }
  
  .pulse-ring {
    width: 60px;
    height: 60px;
  }
}

@media (max-width: 480px) {
  .wave-visualizer {
    height: 30px;
  }
  
  .circular-visualizer {
    width: 60px;
    height: 60px;
  }
  
  .pulse-ring {
    width: 40px;
    height: 40px;
  }
}

/* 不同視覺化類型的顯示控制 */
.player-visualizer[data-type="wave"] .circular-visualizer,
.player-visualizer[data-type="wave"] .particle-container,
.player-visualizer[data-type="wave"] .pulse-container {
  display: none;
}

.player-visualizer[data-type="circular"] .wave-visualizer,
.player-visualizer[data-type="circular"] .particle-container,
.player-visualizer[data-type="circular"] .pulse-container {
  display: none;
}

.player-visualizer[data-type="particles"] .wave-visualizer,
.player-visualizer[data-type="particles"] .circular-visualizer,
.player-visualizer[data-type="particles"] .pulse-container {
  display: none;
}
</style>