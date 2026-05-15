import * as THREE from 'three'
import { WebGPURenderer } from 'three/webgpu'

import { LODBillboard } from './index'

/**
 * Demo: BoxGeometry mesh (3D, detail đầy đủ) tại gần — sprite billboard tại xa.
 * Camera oscillate z=3↔20 để thấy LOD switch tại threshold=10.
 */
export async function createDemo(canvas: HTMLCanvasElement): Promise<{ dispose(): void }> {
  const w = canvas.clientWidth || 300
  const h = canvas.clientHeight || 200

  const renderer = new WebGPURenderer({ canvas, antialias: true })
  renderer.setPixelRatio(1)
  renderer.setSize(w, h)
  await renderer.init()

  const scene = new THREE.Scene()
  scene.background = new THREE.Color(0x111111)

  const camera = new THREE.PerspectiveCamera(60, w / h, 0.1, 200)
  camera.position.set(0, 0, 5)

  scene.add(new THREE.AmbientLight(0xffffff, 0.5))
  const dirLight = new THREE.DirectionalLight(0xffffff, 1.5)
  dirLight.position.set(2, 4, 3)
  scene.add(dirLight)

  // 3D mesh (hiển thị khi camera gần)
  const geometry = new THREE.BoxGeometry(1, 1.5, 0.8)
  const material = new THREE.MeshStandardMaterial({ color: 0x4488cc })
  const mesh = new THREE.Mesh(geometry, material)

  // Billboard texture từ canvas: gradient circle — icon đại diện character
  const texCanvas = document.createElement('canvas')
  texCanvas.width = 64
  texCanvas.height = 64
  const ctx = texCanvas.getContext('2d')!
  ctx.fillStyle = '#000000'
  ctx.fillRect(0, 0, 64, 64)
  const grad = ctx.createRadialGradient(32, 28, 0, 32, 28, 26)
  grad.addColorStop(0, '#88ccff')
  grad.addColorStop(1, '#224488')
  ctx.fillStyle = grad
  ctx.beginPath()
  ctx.arc(32, 28, 26, 0, Math.PI * 2)
  ctx.fill()

  const billboardMap = new THREE.CanvasTexture(texCanvas)

  // threshold=10: camera trong vòng 10 unit → mesh 3D; ngoài 10 unit → billboard sprite
  const lodb = new LODBillboard({
    mesh,
    billboardMap,
    billboardScale: 1.5,
    threshold: 10,
    hysteresis: 0.1,
  })
  scene.add(lodb.getLOD())

  const clock = new THREE.Clock()

  renderer.setAnimationLoop(() => {
    const t = clock.getElapsedTime()
    // z oscillate: 3 (gần — mesh 3D) → 20 (xa — billboard)
    camera.position.z = 3 + (Math.sin(t * 0.4) * 0.5 + 0.5) * 17
    renderer.render(scene, camera)
  })

  return {
    dispose() {
      renderer.setAnimationLoop(null)
      lodb.dispose()
      billboardMap.dispose()
      geometry.dispose()
      material.dispose()
      renderer.dispose()
    },
  }
}
