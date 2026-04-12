<template>
  <div
    ref="containerRef"
    class="hero-scene"
    :class="{ 'hero-scene--hidden': !visible }"
    aria-hidden="true"
  ></div>
</template>

<script setup>
import { ref, watch, onMounted, onUnmounted } from 'vue'
import * as THREE from 'three'

const props = defineProps({
  visible: { type: Boolean, default: true }
})

const containerRef = ref(null)

let renderer, scene, camera, animFrameId
let particles, torus, torusInner, pointLight
let clock

function init() {
  const el = containerRef.value
  if (!el) return

  clock = new THREE.Clock()

  // Renderer
  renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true })
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
  renderer.setSize(el.clientWidth, el.clientHeight)
  renderer.setClearColor(0x000000, 0)
  el.appendChild(renderer.domElement)

  // Scene
  scene = new THREE.Scene()

  // Camera
  camera = new THREE.PerspectiveCamera(60, el.clientWidth / el.clientHeight, 0.1, 1000)
  camera.position.set(0, 0, 28)

  // --- 粒子系統 ---
  const isMobile = window.innerWidth < 768
  const particleCount = isMobile ? 800 : 2000
  const positions = new Float32Array(particleCount * 3)
  const colors = new Float32Array(particleCount * 3)
  const scales = new Float32Array(particleCount)

  const colorA = new THREE.Color('#FF3B3B')   // 紅
  const colorB = new THREE.Color('#3B82F6')   // 藍
  const colorC = new THREE.Color('#a855f7')   // 紫

  for (let i = 0; i < particleCount; i++) {
    // 球狀分佈
    const r = 12 + Math.random() * 10
    const theta = Math.random() * Math.PI * 2
    const phi = Math.acos(2 * Math.random() - 1)
    positions[i * 3]     = r * Math.sin(phi) * Math.cos(theta)
    positions[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta)
    positions[i * 3 + 2] = r * Math.cos(phi)

    // 混合顏色
    const t = Math.random()
    let c
    if (t < 0.4) c = colorA.clone().lerp(colorB, Math.random())
    else if (t < 0.7) c = colorB.clone().lerp(colorC, Math.random())
    else c = colorC.clone().lerp(colorA, Math.random())
    colors[i * 3]     = c.r
    colors[i * 3 + 1] = c.g
    colors[i * 3 + 2] = c.b

    scales[i] = 0.5 + Math.random() * 1.5
  }

  const geo = new THREE.BufferGeometry()
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3))
  geo.setAttribute('color', new THREE.BufferAttribute(colors, 3))

  const mat = new THREE.PointsMaterial({
    size: 0.12,
    vertexColors: true,
    transparent: true,
    opacity: 0.85,
    sizeAttenuation: true,
    depthWrite: false,
  })

  particles = new THREE.Points(geo, mat)
  scene.add(particles)

  // --- 中心幾何體：Torus ---
  const torusGeo = new THREE.TorusGeometry(3.5, 0.28, 24, 120)
  const torusMat = new THREE.MeshStandardMaterial({
    color: '#FF3B3B',
    emissive: '#FF1A1A',
    emissiveIntensity: 1.2,
    metalness: 0.6,
    roughness: 0.2,
  })
  torus = new THREE.Mesh(torusGeo, torusMat)
  scene.add(torus)

  // 內層小圓環（對比色）
  const torusInnerGeo = new THREE.TorusGeometry(1.8, 0.12, 16, 80)
  const torusInnerMat = new THREE.MeshStandardMaterial({
    color: '#a855f7',
    emissive: '#7c3aed',
    emissiveIntensity: 1.5,
    metalness: 0.7,
    roughness: 0.1,
  })
  torusInner = new THREE.Mesh(torusInnerGeo, torusInnerMat)
  torusInner.rotation.x = Math.PI / 2
  scene.add(torusInner)

  // 中心播放三角形
  const triShape = new THREE.Shape()
  triShape.moveTo(0, 1.1)
  triShape.lineTo(0.95, -0.55)
  triShape.lineTo(-0.95, -0.55)
  triShape.closePath()
  const triGeo = new THREE.ShapeGeometry(triShape)
  const triMat = new THREE.MeshBasicMaterial({ color: '#ffffff', side: THREE.DoubleSide, transparent: true, opacity: 0.92 })
  const triangle = new THREE.Mesh(triGeo, triMat)
  triangle.position.x = 0.15
  scene.add(triangle)

  // 光源
  const ambient = new THREE.AmbientLight(0xffffff, 0.3)
  scene.add(ambient)
  pointLight = new THREE.PointLight('#FF3B3B', 4, 30)
  pointLight.position.set(0, 0, 8)
  scene.add(pointLight)
  const blueLight = new THREE.PointLight('#3B82F6', 3, 25)
  blueLight.position.set(10, -5, 5)
  scene.add(blueLight)

  animate()
}

function animate() {
  animFrameId = requestAnimationFrame(animate)
  const t = clock.getElapsedTime()

  // 粒子緩慢旋轉
  particles.rotation.y = t * 0.04
  particles.rotation.x = t * 0.02

  // 主環脈衝縮放 + 旋轉
  const pulse = 1 + 0.06 * Math.sin(t * 1.8)
  torus.rotation.x = t * 0.3
  torus.rotation.y = t * 0.5
  torus.scale.setScalar(pulse)

  // 內環反向旋轉
  torusInner.rotation.z = t * -0.7
  torusInner.rotation.x = Math.PI / 2 + t * 0.2

  // 光源搖曳
  pointLight.intensity = 3.5 + 1.5 * Math.sin(t * 2.3)
  pointLight.position.x = Math.sin(t * 0.6) * 3
  pointLight.position.y = Math.cos(t * 0.4) * 2

  // 相機輕微漂移
  camera.position.x = Math.sin(t * 0.15) * 1.5
  camera.position.y = Math.cos(t * 0.1) * 0.8
  camera.lookAt(0, 0, 0)

  renderer.render(scene, camera)
}

function onResize() {
  const el = containerRef.value
  if (!el || !renderer) return
  const w = el.clientWidth
  const h = el.clientHeight
  camera.aspect = w / h
  camera.updateProjectionMatrix()
  renderer.setSize(w, h)
}

let resizeTimer
function handleResize() {
  clearTimeout(resizeTimer)
  resizeTimer = setTimeout(onResize, 150)
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
  renderer.domElement.remove()
  renderer = null
}

// 可見性改變時停止/恢復動畫
watch(() => props.visible, (v) => {
  if (!renderer) return
  if (v) {
    animate()
  } else {
    cancelAnimationFrame(animFrameId)
  }
})

onMounted(() => {
  init()
  window.addEventListener('resize', handleResize)
})

onUnmounted(dispose)
</script>

<style scoped>
.hero-scene {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
  transition: opacity 600ms cubic-bezier(0.4, 0, 0.2, 1);
  opacity: 1;
}

.hero-scene--hidden {
  opacity: 0;
}

.hero-scene :deep(canvas) {
  display: block;
  width: 100% !important;
  height: 100% !important;
}
</style>
