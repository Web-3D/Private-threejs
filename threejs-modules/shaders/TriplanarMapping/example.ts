/**
 * VỊ TRÍ   : threejs-modules/shaders/TriplanarMapping/example.ts
 * VAI TRÒ  : Minimal scene test visual — sphere không có UV, texture phủ bằng triplanar
 * CÁCH DÙNG: Chạy độc lập trong browser, không import vào project chính
 * GHI CHÚ  : Dùng WebGPURenderer vì NodeMaterial yêu cầu WebGPU backend
 */

import * as THREE from 'three'
import { WebGPURenderer } from 'three/webgpu'
import { TriplanarMapping } from './index'

async function init(): Promise<void> {
  // WebGPU renderer — NodeMaterial yêu cầu
  const renderer = new WebGPURenderer({ antialias: true })
  await renderer.init()
  renderer.setSize(800, 600)
  renderer.setPixelRatio(window.devicePixelRatio)
  document.body.appendChild(renderer.domElement)

  const scene = new THREE.Scene()
  scene.background = new THREE.Color(0x222222)

  const camera = new THREE.PerspectiveCamera(60, 800 / 600, 0.1, 100)
  camera.position.set(0, 0, 3)

  // Dùng SphereGeometry — test rõ nhất vì có normal đủ mọi hướng
  const geometry = new THREE.SphereGeometry(1, 64, 64)

  const map = new THREE.TextureLoader().load(
    'https://threejs.org/examples/textures/uv_grid_opengl.jpg'
  )
  map.wrapS = map.wrapT = THREE.RepeatWrapping

  const triplanar = new TriplanarMapping({ map, scale: 1.0 })
  const mesh = new THREE.Mesh(geometry, triplanar.getMaterial())
  scene.add(mesh)

  // Ambient light để thấy texture rõ hơn
  scene.add(new THREE.AmbientLight(0xffffff, 1.5))

  function animate(): void {
    requestAnimationFrame(animate)
    mesh.rotation.y += 0.004  // Xoay để thấy texture cố định trong world-space
    renderer.render(scene, camera)
  }
  animate()

  window.addEventListener('beforeunload', () => {
    triplanar.dispose()
    map.dispose()
    geometry.dispose()
    renderer.dispose()
  })
}

init().catch(console.error)
