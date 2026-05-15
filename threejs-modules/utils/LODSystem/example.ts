import * as THREE from 'three'
import { WebGPURenderer } from 'three/webgpu'

import { LODSystem } from './index'

function createSphere(detail: number): THREE.Mesh {
  return new THREE.Mesh(
    new THREE.IcosahedronGeometry(1, detail),
    new THREE.MeshNormalMaterial({ wireframe: true }),
  )
}

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
  camera.position.set(0, 2, 5)

  const lodSystem = new LODSystem({
    levels: [
      { mesh: createSphere(4), distance: 0 },
      { mesh: createSphere(2), distance: 8 },
      { mesh: createSphere(0), distance: 20 },
    ],
  })

  scene.add(lodSystem.getLOD())
  scene.add(new THREE.GridHelper(40, 20, 0x333333, 0x222222))

  let t = 0
  renderer.setAnimationLoop(() => {
    t += 0.005
    camera.position.z = 3 + Math.abs(Math.sin(t)) * 35
    renderer.render(scene, camera)
  })

  return {
    dispose() {
      renderer.setAnimationLoop(null)
      lodSystem.dispose()
      renderer.dispose()
    },
  }
}
