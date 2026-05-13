/**
 * VỊ TRÍ   : threejs-modules/shaders/WorldNoise/example.ts
 * VAI TRÒ  : Minimal scene test visual — sphere animated bằng world-space noise
 * CÁCH DÙNG: Chạy độc lập trong browser, không import vào project chính
 * GHI CHÚ  : Dùng WebGPURenderer vì NodeMaterial yêu cầu WebGPU backend
 */

import * as THREE from 'three'
import { WebGPURenderer } from 'three/webgpu'
import { WorldNoise } from './index'

async function init(): Promise<void> {
  const renderer = new WebGPURenderer({ antialias: true })
  await renderer.init()
  renderer.setSize(800, 600)
  renderer.setPixelRatio(window.devicePixelRatio)
  document.body.appendChild(renderer.domElement)

  const scene = new THREE.Scene()
  scene.background = new THREE.Color(0x111111)

  const camera = new THREE.PerspectiveCamera(60, 800 / 600, 0.1, 100)
  camera.position.set(0, 0, 3)

  const geometry = new THREE.SphereGeometry(1, 64, 64)

  // noise1 = slow dark-to-light animation
  const noise1 = new WorldNoise({ speed: 0.5, scale: 1.5, color1: 0x1a0a2e, color2: 0x8040ff })
  const mesh1 = new THREE.Mesh(geometry, noise1.getMaterial())
  mesh1.position.x = -1.2
  scene.add(mesh1)

  // noise2 = faster, tighter scale
  const noise2 = new WorldNoise({ speed: 2.0, scale: 3.0, color1: 0x001a0a, color2: 0x00ff88 })
  const mesh2 = new THREE.Mesh(geometry, noise2.getMaterial())
  mesh2.position.x = 1.2
  scene.add(mesh2)

  scene.add(new THREE.AmbientLight(0xffffff, 0.5))

  const clock = new THREE.Clock()

  function animate(): void {
    requestAnimationFrame(animate)
    const t = clock.getElapsedTime()
    // Mesh xoay — texture cố định trong world-space, không xoay cùng
    mesh1.rotation.y += 0.005
    mesh2.rotation.y -= 0.005
    noise1.update(t)
    noise2.update(t)
    renderer.render(scene, camera)
  }
  animate()

  window.addEventListener('beforeunload', () => {
    noise1.dispose()
    noise2.dispose()
    geometry.dispose()
    renderer.dispose()
  })
}

init().catch(console.error)
