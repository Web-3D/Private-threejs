import * as THREE from 'three'
import { WebGPURenderer } from 'three/webgpu'

import { TriplanarMapping } from './index'

export async function createDemo(canvas: HTMLCanvasElement): Promise<{ dispose(): void }> {
  const w = canvas.clientWidth || 300
  const h = canvas.clientHeight || 200

  const renderer = new WebGPURenderer({ canvas, antialias: true })
  renderer.setPixelRatio(1)
  renderer.setSize(w, h)
  await renderer.init()

  const scene = new THREE.Scene()
  scene.background = new THREE.Color(0x222222)

  const camera = new THREE.PerspectiveCamera(60, w / h, 0.1, 100)
  camera.position.set(0, 0, 3)

  const geometry = new THREE.SphereGeometry(1, 64, 64)
  const map = new THREE.TextureLoader().load(
    'https://threejs.org/examples/textures/uv_grid_opengl.jpg',
  )
  map.wrapS = map.wrapT = THREE.RepeatWrapping

  const triplanar = new TriplanarMapping({ map, scale: 1.0 })
  const mesh = new THREE.Mesh(geometry, triplanar.getMaterial())
  scene.add(mesh)
  scene.add(new THREE.AmbientLight(0xffffff, 1.5))

  renderer.setAnimationLoop(() => {
    mesh.rotation.y += 0.004
    renderer.render(scene, camera)
  })

  return {
    dispose() {
      renderer.setAnimationLoop(null)
      triplanar.dispose()
      map.dispose()
      geometry.dispose()
      renderer.dispose()
    },
  }
}
