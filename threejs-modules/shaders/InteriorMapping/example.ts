/**
 * VỊ TRÍ   : threejs-modules/shaders/InteriorMapping/example.ts
 * VAI TRÒ  : Demo interior mapping — grid panel giả lập cửa sổ building
 * CÁCH DÙNG: Chạy độc lập trong browser. Cần 1 texture hình phòng (room.jpg/png)
 */

import * as THREE from 'three'
import { WebGPURenderer } from 'three/webgpu'
import { InteriorMapping } from './index'

async function init(): Promise<void> {
  const renderer = new WebGPURenderer({ antialias: true })
  await renderer.init()
  renderer.setSize(800, 600)
  renderer.setPixelRatio(window.devicePixelRatio)
  document.body.appendChild(renderer.domElement)

  const scene = new THREE.Scene()
  scene.background = new THREE.Color(0x222222)

  const camera = new THREE.PerspectiveCamera(50, 800 / 600, 0.1, 100)
  camera.position.set(0, 0, 4)
  camera.lookAt(0, 0, 0)

  // Tạo placeholder texture (gradient xanh lá — thay bằng ảnh phòng thật)
  const canvas = document.createElement('canvas')
  canvas.width = 256; canvas.height = 256
  const ctx = canvas.getContext('2d')!
  const grad = ctx.createLinearGradient(0, 0, 256, 256)
  grad.addColorStop(0, '#1a3a5c')
  grad.addColorStop(0.4, '#2d6a9f')
  grad.addColorStop(0.7, '#c4a35a')
  grad.addColorStop(1, '#3a1a0a')
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, 256, 256)
  ctx.fillStyle = 'rgba(255,255,200,0.3)'
  ctx.fillRect(30, 180, 80, 60)
  ctx.fillRect(150, 180, 80, 60)
  const roomTexture = new THREE.CanvasTexture(canvas)

  // 4 tiling — giả lập 4x4 cửa sổ
  const interior = new InteriorMapping({ map: roomTexture, tiling: 4, depth: 0.6 })

  const geo = new THREE.PlaneGeometry(3, 3)
  geo.computeTangents()  // PlaneGeometry có tangent mặc định, gọi để chắc chắn
  const mesh = new THREE.Mesh(geo, interior.getMaterial())
  scene.add(mesh)

  // Camera orbit nhẹ để thấy parallax effect
  let t = 0
  function animate(): void {
    requestAnimationFrame(animate)
    t += 0.008
    camera.position.x = Math.sin(t) * 2.5
    camera.position.y = Math.sin(t * 0.5) * 1.2
    camera.lookAt(0, 0, 0)
    renderer.render(scene, camera)
  }
  animate()

  window.addEventListener('beforeunload', () => {
    interior.dispose()
    roomTexture.dispose()
    geo.dispose()
    renderer.dispose()
  })
}

init().catch(console.error)
