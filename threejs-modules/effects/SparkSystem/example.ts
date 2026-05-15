import * as THREE from 'three'
import { WebGPURenderer } from 'three/webgpu'

import { SparkSystem } from './index'

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
  camera.position.set(0, 2, 8)
  camera.lookAt(0, 2, 0)

  const sparks = new SparkSystem({
    count: 500,
    lifetime: 1.5,
    speed: 4.0,
    gravity: 4.0,
    spread: Math.PI / 4,
    turbulence: true,
    shape: 'cone',
  })
  scene.add(sparks.points)

  const clock = new THREE.Clock()

  renderer.setAnimationLoop(() => {
    sparks.update(clock.getElapsedTime())
    renderer.render(scene, camera)
  })

  return {
    dispose() {
      renderer.setAnimationLoop(null)
      sparks.dispose()
      renderer.dispose()
    },
  }
}
