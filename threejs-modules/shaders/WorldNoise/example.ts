import * as THREE from 'three'
import { WebGPURenderer } from 'three/webgpu'

import { WorldNoise } from './index'

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
  camera.position.set(0, 0, 3)

  const geometry = new THREE.SphereGeometry(1, 64, 64)

  const noise1 = new WorldNoise({ speed: 0.5, scale: 1.5, color1: 0x1a0a2e, color2: 0x8040ff })
  const mesh1 = new THREE.Mesh(geometry, noise1.getMaterial())
  mesh1.position.x = -1.2
  scene.add(mesh1)

  const noise2 = new WorldNoise({ speed: 2.0, scale: 3.0, color1: 0x001a0a, color2: 0x00ff88 })
  const mesh2 = new THREE.Mesh(geometry, noise2.getMaterial())
  mesh2.position.x = 1.2
  scene.add(mesh2)

  scene.add(new THREE.AmbientLight(0xffffff, 0.5))

  const clock = new THREE.Clock()

  renderer.setAnimationLoop(() => {
    const t = clock.getElapsedTime()
    mesh1.rotation.y += 0.005
    mesh2.rotation.y -= 0.005
    noise1.update(t)
    noise2.update(t)
    renderer.render(scene, camera)
  })

  return {
    dispose() {
      renderer.setAnimationLoop(null)
      noise1.dispose()
      noise2.dispose()
      geometry.dispose()
      renderer.dispose()
    },
  }
}
