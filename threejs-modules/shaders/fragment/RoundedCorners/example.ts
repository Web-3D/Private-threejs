import * as THREE from 'three'
import { WebGPURenderer } from 'three/webgpu'

import { RoundedCorners } from './index'

export async function createDemo(canvas: HTMLCanvasElement): Promise<{ dispose(): void }> {
  const w = canvas.clientWidth || 300
  const h = canvas.clientHeight || 200
  const aspect = w / h

  const renderer = new WebGPURenderer({ canvas, antialias: true })
  renderer.setPixelRatio(1)
  renderer.setSize(w, h)
  await renderer.init()

  const scene = new THREE.Scene()
  scene.background = new THREE.Color(0x222222)

  const camera = new THREE.OrthographicCamera(-aspect * 1.5, aspect * 1.5, 1.5, -1.5, 0.1, 10)
  camera.position.z = 5

  const panelGeo = new THREE.PlaneGeometry(1.2, 0.8)

  const p1 = new RoundedCorners({ radius: 0.05, fillColor: 0x4488ff })
  const mesh1 = new THREE.Mesh(panelGeo, p1.getMaterial())
  mesh1.position.set(-1.4, 0, 0)
  scene.add(mesh1)

  const p2 = new RoundedCorners({ radius: 0.2, fillColor: 0xff6644 })
  const mesh2 = new THREE.Mesh(panelGeo, p2.getMaterial())
  scene.add(mesh2)

  const p3 = new RoundedCorners({ radius: 0.5, fillColor: 0x44ff88 })
  const mesh3 = new THREE.Mesh(panelGeo, p3.getMaterial())
  mesh3.position.set(1.4, 0, 0)
  scene.add(mesh3)

  renderer.setAnimationLoop(() => {
    renderer.render(scene, camera)
  })

  return {
    dispose() {
      renderer.setAnimationLoop(null)
      p1.dispose()
      p2.dispose()
      p3.dispose()
      panelGeo.dispose()
      renderer.dispose()
    },
  }
}
