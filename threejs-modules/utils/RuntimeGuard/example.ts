import * as THREE from 'three'
import { WebGPURenderer } from 'three/webgpu'

import { RuntimeGuard } from './index'

export async function createDemo(canvas: HTMLCanvasElement): Promise<{ dispose(): void }> {
  const w = canvas.clientWidth || 300
  const h = canvas.clientHeight || 200

  const renderer = new WebGPURenderer({ canvas })
  renderer.setPixelRatio(1)
  renderer.setSize(w, h)
  await renderer.init()

  const scene = new THREE.Scene()
  scene.background = new THREE.Color(0x111111)

  const camera = new THREE.PerspectiveCamera(75, w / h, 0.1, 1000)
  camera.position.set(0, 1, 3)

  const guard = new RuntimeGuard(renderer, { drawCallLimit: 100 })

  const geo = new THREE.BoxGeometry()
  const mat = new THREE.MeshNormalMaterial()
  const mesh = new THREE.Mesh(geo, mat)
  scene.add(mesh)

  renderer.setAnimationLoop(() => {
    mesh.rotation.y += 0.01
    renderer.render(scene, camera)
    guard.check()
  })

  return {
    dispose() {
      renderer.setAnimationLoop(null)
      geo.dispose()
      mat.dispose()
      guard.dispose()
      renderer.dispose()
    },
  }
}
