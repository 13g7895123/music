<template>
  <canvas
    ref="canvasRef"
    class="audio-visualizer"
    :class="{ 'audio-visualizer--active': isPlaying }"
    aria-hidden="true"
  ></canvas>
</template>

<script setup>
import { ref, watch, onMounted, onUnmounted } from 'vue'
import * as THREE from 'three'

const props = defineProps({
  isPlaying: { type: Boolean, default: false }
})

const canvasRef = ref(null)

let renderer, scene, camera, animFrameId, clock
let particlesMesh, ringMeshes = [], waveLines = []
let amplitude = 0         // 目前振幅（lerp 目標）
let targetAmplitude = 0   // 目標振幅

function init() {
  const canvas = canvasRef.value
  if (!canvas) return

  clock = new THREE.Clock()

  renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: false })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.5))
  renderer.setSize(window.innerWidth, window.innerHeight)
  renderer.setClearColor(0x000000, 0)

  scene = new THREE.Scene()
  camera = new THREE.OrthographicCamera(
    -window.innerWidth / 2, window.innerWidth / 2,
    window.innerHeight / 2, -window.innerHeight / 2,
    0.1, 100
  )
  camera.position.z = 10

  buildParticles()
  buildWaveLines()
  buildRings()
  animate()
}

// ---- 浮動粒子（背景氛圍） ----
function buildParticles() {
  const isMobile = window.innerWidth < 768
  const count = isMobile ? 500 : 1200

  const positions = new Float32Array(count * 3)
  const velocities = new Float32Array(count * 2)  // 存在 userData
  const colors = new Float32Array(count * 3)

  const palette = [
    new THREE.Color('#FF3B3B'),
    new THREE.Color('#FF6B6B'),
    new THREE.Color('#a855f7'),
    new THREE.Color('#3B82F6'),
    new THREE.Color('#ffffff'),
  ]

  for (let i = 0; i < count; i++) {
    positions[i * 3]     = (Math.random() - 0.5) * window.innerWidth * 1.2
    positions[i * 3 + 1] = (Math.random() - 0.5) * window.innerHeight * 1.2
    positions[i * 3 + 2] = Math.random() * -5

    velocities[i * 2]     = (Math.random() - 0.5) * 0.3
    velocities[i * 2 + 1] = (Math.random() - 0.5) * 0.3

    const c = palette[Math.floor(Math.random() * palette.length)]
    colors[i * 3]     = c.r
    colors[i * 3 + 1] = c.g
    colors[i * 3 + 2] = c.b
  }

  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3))

  const mat = new THREE.PointsMaterial({
    size: 2.5,
    vertexColors: true,
    transparent: true,
    opacity: 0,
    sizeAttenuation: false,
    depthWrite: false,
  })

  particlesMesh = new THREE.Points(geo, mat)
  particlesMesh.userData.velocities = velocities
  scene.add(particlesMesh)
}

// ---- 頻譜波形線（正弦疊加模擬） ----
function buildWaveLines() {
  const waveCount = 5
  const waveColors = ['#FF3B3B', '#FF6060', '#a855f7', '#3B82F6', '#7c3aed']
  const waveY = [-60, -30, 0, 30, 60]
  const segments = 128

  for (let w = 0; w < waveCount; w++) {
    const positions = new Float32Array((segments + 1) * 3)
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))

    const mat = new THREE.LineBasicMaterial({
      color: waveColors[w],
      transparent: true,
      opacity: 0,
    })

    const line = new THREE.Line(geo, mat)
    line.userData = { yBase: waveY[w], freqMultiplier: 0.8 + w * 0.4, phaseOffset: w * 1.1 }
    waveLines.push(line)
    scene.add(line)
  }
}

// ---- 發光同心環 ----
function buildRings() {
  const ringData = [
    { r: 80,  color: '#FF3B3B', speed: 0.4 },
    { r: 150, color: '#a855f7', speed: -0.25 },
    { r: 230, color: '#3B82F6', speed: 0.18 },
  ]

  for (const { r, color, speed } of ringData) {
    const geo = new THREE.RingGeometry(r - 1, r + 1, 128)
    const mat = new THREE.MeshBasicMaterial({
      color,
      transparent: true,
      opacity: 0,
      side: THREE.DoubleSide,
    })
    const mesh = new THREE.Mesh(geo, mat)
    mesh.userData.speed = speed
    mesh.userData.baseR = r
    ringMeshes.push(mesh)
    scene.add(mesh)
  }
}

// ---- 主動畫迴圈 ----
function animate() {
  animFrameId = requestAnimationFrame(animate)
  const t = clock.getElapsedTime()

  // 平滑振幅過渡
  amplitude += (targetAmplitude - amplitude) * 0.04

  // 粒子
  updateParticles(t)

  // 波形線
  updateWaveLines(t)

  // 環
  updateRings(t)

  renderer.render(scene, camera)
}

function updateParticles(t) {
  const geo = particlesMesh.geometry
  const pos = geo.attributes.position.array
  const vel = particlesMesh.userData.velocities
  const count = pos.length / 3

  const drift = amplitude * 1.2
  for (let i = 0; i < count; i++) {
    pos[i * 3]     += vel[i * 2]     * (1 + drift)
    pos[i * 3 + 1] += vel[i * 2 + 1] * (1 + drift) + 0.05

    // 邊界循環
    const hw = window.innerWidth  * 0.65
    const hh = window.innerHeight * 0.65
    if (pos[i * 3] > hw)  pos[i * 3]     = -hw
    if (pos[i * 3] < -hw) pos[i * 3]     = hw
    if (pos[i * 3 + 1] > hh)  pos[i * 3 + 1] = -hh
    if (pos[i * 3 + 1] < -hh) pos[i * 3 + 1] = hh
  }
  geo.attributes.position.needsUpdate = true

  // 透明度跟著振幅
  particlesMesh.material.opacity = amplitude * 0.55
  particlesMesh.material.size = 2.5 + amplitude * 1.5
}

function updateWaveLines(t) {
  const width = window.innerWidth
  const segments = 128

  waveLines.forEach((line, wi) => {
    const { yBase, freqMultiplier, phaseOffset } = line.userData
    const pos = line.geometry.attributes.position.array

    for (let i = 0; i <= segments; i++) {
      const x = (i / segments - 0.5) * width * 1.1
      // 多層正弦疊加
      const wave =
        Math.sin(i * 0.12 * freqMultiplier + t * 2.1 + phaseOffset) * 18 * amplitude +
        Math.sin(i * 0.07 * freqMultiplier + t * 3.3 + phaseOffset * 1.3) * 10 * amplitude +
        Math.sin(i * 0.22 * freqMultiplier + t * 1.5 + phaseOffset * 0.7) * 6 * amplitude

      pos[i * 3]     = x
      pos[i * 3 + 1] = yBase + wave
      pos[i * 3 + 2] = 0
    }
    line.geometry.attributes.position.needsUpdate = true
    line.material.opacity = amplitude * (0.35 - wi * 0.04)
  })
}

function updateRings(t) {
  ringMeshes.forEach((mesh, i) => {
    mesh.rotation.z += mesh.userData.speed * 0.01
    const pulseScale = 1 + amplitude * (0.08 + i * 0.04) * Math.sin(t * 2 + i)
    mesh.scale.setScalar(pulseScale)
    mesh.material.opacity = amplitude * (0.18 - i * 0.03)
  })
}

// ---- resize ----
let resizeTimer
function handleResize() {
  clearTimeout(resizeTimer)
  resizeTimer = setTimeout(() => {
    if (!renderer) return
    renderer.setSize(window.innerWidth, window.innerHeight)
    camera.left   = -window.innerWidth  / 2
    camera.right  =  window.innerWidth  / 2
    camera.top    =  window.innerHeight / 2
    camera.bottom = -window.innerHeight / 2
    camera.updateProjectionMatrix()
  }, 150)
}

function dispose() {
  cancelAnimationFrame(animFrameId)
  window.removeEventListener('resize', handleResize)
  if (!renderer) return
  scene.traverse(obj => {
    if (obj.geometry) obj.geometry.dispose()
    if (obj.material) {
      if (Array.isArray(obj.material)) obj.material.forEach(m => m.dispose())
      else obj.material.dispose()
    }
  })
  renderer.dispose()
  renderer = null
}

watch(() => props.isPlaying, (playing) => {
  targetAmplitude = playing ? 1 : 0
})

onMounted(() => {
  init()
  window.addEventListener('resize', handleResize)
})

onUnmounted(dispose)
</script>

<style scoped>
.audio-visualizer {
  position: fixed;
  inset: 0;
  width: 100vw;
  height: 100vh;
  pointer-events: none;
  z-index: 0;
  opacity: 0;
  transition: opacity 1200ms cubic-bezier(0.4, 0, 0.2, 1);
}

.audio-visualizer--active {
  opacity: 1;
}
</style>
