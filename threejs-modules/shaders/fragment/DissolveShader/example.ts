import * as THREE from 'three'
import { WebGPURenderer } from 'three/webgpu'
import { DissolveShader } from './index'

export async function createDemo(canvas: HTMLCanvasElement): Promise<{ dispose(): void }> {
  const w = canvas.clientWidth || 300
  const h = canvas.clientHeight || 200

  const renderer = new WebGPURenderer({ canvas, antialias: true })
  renderer.setPixelRatio(1)
  renderer.setSize(w, h)
  await renderer.init()

  const scene = new THREE.Scene()
  scene.background = new THREE.Color(0x111122)

  const camera = new THREE.PerspectiveCamera(60, w / h, 0.1, 100)
  camera.position.set(0, 0, 4)
  camera.lookAt(0, 0, 0)

  const dissolve = new DissolveShader({
    baseColor: 0x4488ff,
    edgeColor: 0x00ffcc,
    edgeWidth: 0.08,
    scale: 1.8,
  })

  const geo = new THREE.SphereGeometry(1, 32, 32)
  const mesh = new THREE.Mesh(geo, dissolve.getMaterial())
  scene.add(mesh)

  const clock = new THREE.Clock()
  let started = false

  renderer.setAnimationLoop(() => {
    const t = clock.getElapsedTime()
    dissolve.update(t)

    // Trigger dissolveOut 1s after start
    if (!started && t > 1.0) {
      dissolve.dissolveOut(2.5, t)
      started = true
    }

    mesh.rotation.y += 0.005
    renderer.render(scene, camera)
  })

  return {
    dispose() {
      renderer.setAnimationLoop(null)
      dissolve.dispose()
      geo.dispose()
      renderer.dispose()
    },
  }
}
