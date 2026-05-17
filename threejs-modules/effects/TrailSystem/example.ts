import * as THREE from 'three'
import { WebGPURenderer } from 'three/webgpu'
import { TrailSystem } from './index'

export async function createDemo(canvas: HTMLCanvasElement): Promise<{ dispose(): void }> {
  const w = canvas.clientWidth || 300
  const h = canvas.clientHeight || 200

  const renderer = new WebGPURenderer({ canvas, antialias: true })
  renderer.setPixelRatio(1)
  renderer.setSize(w, h)
  await renderer.init()

  const scene = new THREE.Scene()
  scene.background = new THREE.Color(0x080818)

  const camera = new THREE.PerspectiveCamera(60, w / h, 0.1, 100)
  camera.position.set(0, 0, 8)
  camera.lookAt(0, 0, 0)

  // Sphere orbiting in a figure-8 path
  const sphereGeo = new THREE.SphereGeometry(0.2, 16, 16)
  const sphereMat = new THREE.MeshBasicMaterial({ color: 0x88aaff })
  const sphere = new THREE.Mesh(sphereGeo, sphereMat)
  scene.add(sphere)

  const trail = new TrailSystem({ maxLength: 50, width: 0.12, headColor: 0x4488ff })
  scene.add(trail.root)

  const clock = new THREE.Clock()

  renderer.setAnimationLoop(() => {
    const t = clock.getElapsedTime()

    // Figure-8 orbit
    sphere.position.set(
      Math.sin(t) * 2.5,
      Math.sin(t * 2) * 1.2,
      0,
    )

    trail.update(sphere.position, camera)
    renderer.render(scene, camera)
  })

  return {
    dispose() {
      renderer.setAnimationLoop(null)
      trail.dispose()
      sphereGeo.dispose()
      sphereMat.dispose()
      renderer.dispose()
    },
  }
}
