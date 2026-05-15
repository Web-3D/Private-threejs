import * as THREE from 'three'
import { WebGPURenderer } from 'three/webgpu'

import { WindAnimation } from './index'

/**
 * Demo: grass field (subdivided plane) + stalks — shared wind material.
 * Displacement clearly visible khi camera nhìn từ góc xiên.
 */
export async function createDemo(canvas: HTMLCanvasElement): Promise<{ dispose(): void }> {
  const w = canvas.clientWidth || 300
  const h = canvas.clientHeight || 200

  const renderer = new WebGPURenderer({ canvas, antialias: true })
  renderer.setPixelRatio(1)
  renderer.setSize(w, h)
  await renderer.init()

  const scene = new THREE.Scene()
  scene.background = new THREE.Color(0x1a1a2e)

  const camera = new THREE.PerspectiveCamera(55, w / h, 0.1, 100)
  camera.position.set(0, 3, 6)
  camera.lookAt(0, 0, 0)

  scene.add(new THREE.AmbientLight(0xffffff, 0.4))
  const dirLight = new THREE.DirectionalLight(0xffffff, 1.5)
  dirLight.position.set(3, 5, 4)
  scene.add(dirLight)

  // Subdivided plane — nhiều đỉnh để vertex displacement rõ ràng
  const grassGeo = new THREE.PlaneGeometry(8, 6, 40, 30)
  grassGeo.rotateX(-Math.PI / 2)

  const wind = new WindAnimation({ strength: 0.2, frequency: 0.5, baseColor: 0x2d8a4e })
  scene.add(new THREE.Mesh(grassGeo, wind.getMaterial()))

  // Grass stalks — chia sẻ cùng wind material để di chuyển đồng bộ
  const stalkGeo = new THREE.CylinderGeometry(0.04, 0.08, 1.5, 5, 6)
  const stalkPositions: [number, number, number][] = [
    [-2.5, 0.75, -1],
    [-1, 0.75, 0.5],
    [0.5, 0.75, -0.8],
    [2, 0.75, 0.3],
    [-0.5, 0.75, 1.5],
    [1.5, 0.75, 1.2],
  ]
  for (const [x, y, z] of stalkPositions) {
    const stalk = new THREE.Mesh(stalkGeo, wind.getMaterial())
    stalk.position.set(x, y, z)
    scene.add(stalk)
  }

  const clock = new THREE.Clock()

  renderer.setAnimationLoop(() => {
    wind.update(clock.getElapsedTime())
    renderer.render(scene, camera)
  })

  return {
    dispose() {
      renderer.setAnimationLoop(null)
      wind.dispose()
      grassGeo.dispose()
      stalkGeo.dispose()
      renderer.dispose()
    },
  }
}
