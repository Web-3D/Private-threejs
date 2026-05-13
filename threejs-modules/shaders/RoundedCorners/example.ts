/**
 * VỊ TRÍ   : threejs-modules/shaders/RoundedCorners/example.ts
 * VAI TRÒ  : Minimal scene test visual — panel với rounded corners
 * CÁCH DÙNG: Chạy độc lập trong browser, không import vào project chính
 * GHI CHÚ  : Dùng WebGPURenderer vì NodeMaterial yêu cầu WebGPU backend
 */

import * as THREE from 'three'
import { WebGPURenderer } from 'three/webgpu'
import { RoundedCorners } from './index'

async function init(): Promise<void> {
  const renderer = new WebGPURenderer({ antialias: true })
  await renderer.init()
  renderer.setSize(800, 600)
  renderer.setPixelRatio(window.devicePixelRatio)
  document.body.appendChild(renderer.domElement)

  const scene = new THREE.Scene()
  scene.background = new THREE.Color(0x222222)

  const camera = new THREE.OrthographicCamera(-2, 2, 1.5, -1.5, 0.1, 10)
  camera.position.z = 5

  // Các panel với radius khác nhau
  const panelGeo = new THREE.PlaneGeometry(1.2, 0.8)

  const p1 = new RoundedCorners({ radius: 0.05, fillColor: 0x4488ff })
  const mesh1 = new THREE.Mesh(panelGeo, p1.getMaterial())
  mesh1.position.set(-1.4, 0, 0)
  scene.add(mesh1)

  const p2 = new RoundedCorners({ radius: 0.2, fillColor: 0xff6644 })
  const mesh2 = new THREE.Mesh(panelGeo, p2.getMaterial())
  mesh2.position.set(0, 0, 0)
  scene.add(mesh2)

  const p3 = new RoundedCorners({ radius: 0.5, fillColor: 0x44ff88 })
  const mesh3 = new THREE.Mesh(panelGeo, p3.getMaterial())
  mesh3.position.set(1.4, 0, 0)
  scene.add(mesh3)

  function animate(): void {
    requestAnimationFrame(animate)
    renderer.render(scene, camera)
  }
  animate()

  window.addEventListener('beforeunload', () => {
    p1.dispose()
    p2.dispose()
    p3.dispose()
    panelGeo.dispose()
    renderer.dispose()
  })
}

init().catch(console.error)
