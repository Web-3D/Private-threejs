import * as THREE from 'three'
import { WebGPURenderer } from 'three/webgpu'

import { ProceduralFracture } from './index'

export async function createDemo(canvas: HTMLCanvasElement): Promise<{ dispose(): void }> {
  const w = canvas.clientWidth || 300
  const h = canvas.clientHeight || 200

  const renderer = new WebGPURenderer({ canvas, antialias: true })
  renderer.setPixelRatio(1)
  renderer.setSize(w, h)
  await renderer.init()

  const scene = new THREE.Scene()
  scene.background = new THREE.Color(0x111111)

  const camera = new THREE.PerspectiveCamera(60, w / h, 0.1, 100)
  camera.position.set(0, 1, 5)
  camera.lookAt(0, 0, 0)

  const fracture1 = new ProceduralFracture({ intensity: 0.08, scale: 2.5, color1: 0x1a0a00, color2: 0x995533 })
  const geo1 = new THREE.SphereGeometry(1, 64, 64)
  const mesh1 = new THREE.Mesh(geo1, fracture1.getMaterial())
  mesh1.position.set(-1.8, 0, 0)
  scene.add(mesh1)

  const fracture2 = new ProceduralFracture({ intensity: 0.2, scale: 1.5, speed: 0.5, color1: 0x001122, color2: 0x4488bb })
  const geo2 = new THREE.BoxGeometry(1.5, 1.5, 1.5, 32, 32, 32)
  const mesh2 = new THREE.Mesh(geo2, fracture2.getMaterial())
  mesh2.position.set(1.8, 0, 0)
  scene.add(mesh2)

  const clock = new THREE.Clock()

  renderer.setAnimationLoop(() => {
    const t = clock.getElapsedTime()
    fracture1.update(t)
    fracture2.update(t)
    mesh2.rotation.y = t * 0.3
    renderer.render(scene, camera)
  })

  return {
    dispose() {
      renderer.setAnimationLoop(null)
      fracture1.dispose()
      fracture2.dispose()
      geo1.dispose()
      geo2.dispose()
      renderer.dispose()
    },
  }
}
