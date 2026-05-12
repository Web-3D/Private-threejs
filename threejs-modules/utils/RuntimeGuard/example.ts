import * as THREE from 'three'

import { RuntimeGuard } from './index'

export function createExample() {
  const renderer = new THREE.WebGLRenderer()
  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 1000)

  const guard = new RuntimeGuard(renderer, { drawCallLimit: 100 })

  const mesh = new THREE.Mesh(new THREE.BoxGeometry(), new THREE.MeshBasicMaterial())
  scene.add(mesh)

  function animate() {
    requestAnimationFrame(animate)
    renderer.render(scene, camera)
    guard.check()
  }

  animate()

  return () => {
    mesh.geometry.dispose()
    ;(mesh.material as THREE.Material).dispose()
    guard.dispose()
    renderer.dispose()
  }
}
