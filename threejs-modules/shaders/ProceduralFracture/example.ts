/**
 * VỊ TRÍ   : threejs-modules/shaders/ProceduralFracture/example.ts
 * VAI TRÒ  : Demo fracture animation — sphere + box với intensity khác nhau
 * CÁCH DÙNG: Chạy độc lập trong browser
 */

import * as THREE from 'three'
import { WebGPURenderer } from 'three/webgpu'
import { ProceduralFracture } from './index'

async function init(): Promise<void> {
  const renderer = new WebGPURenderer({ antialias: true })
  await renderer.init()
  renderer.setSize(800, 600)
  renderer.setPixelRatio(window.devicePixelRatio)
  document.body.appendChild(renderer.domElement)

  const scene = new THREE.Scene()
  scene.background = new THREE.Color(0x111111)

  const camera = new THREE.PerspectiveCamera(60, 800 / 600, 0.1, 100)
  camera.position.set(0, 1, 5)
  camera.lookAt(0, 0, 0)

  // Sphere — fracture nhẹ
  const fracture1 = new ProceduralFracture({ intensity: 0.08, scale: 2.5, color1: 0x1a0a00, color2: 0x995533 })
  const mesh1 = new THREE.Mesh(new THREE.SphereGeometry(1, 64, 64), fracture1.getMaterial())
  mesh1.position.set(-1.8, 0, 0)
  scene.add(mesh1)

  // Box — fracture mạnh
  const fracture2 = new ProceduralFracture({ intensity: 0.2, scale: 1.5, speed: 0.5, color1: 0x001122, color2: 0x4488bb })
  const mesh2 = new THREE.Mesh(new THREE.BoxGeometry(1.5, 1.5, 1.5, 32, 32, 32), fracture2.getMaterial())
  mesh2.position.set(1.8, 0, 0)
  scene.add(mesh2)

  scene.add(new THREE.GridHelper(10, 10, 0x333333, 0x222222))

  const clock = new THREE.Clock()

  function animate(): void {
    requestAnimationFrame(animate)
    const t = clock.getElapsedTime()
    fracture1.update(t)
    fracture2.update(t)
    mesh2.rotation.y = t * 0.3
    renderer.render(scene, camera)
  }
  animate()

  window.addEventListener('beforeunload', () => {
    fracture1.dispose()
    fracture2.dispose()
    mesh1.geometry.dispose()
    mesh2.geometry.dispose()
    renderer.dispose()
  })
}

init().catch(console.error)
