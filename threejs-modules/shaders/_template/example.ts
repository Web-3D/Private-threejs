import * as THREE from 'three'

import { ShaderName } from './index'

// Minimal example — copy và đổi ShaderName thành tên module thật
export function createExample(scene: THREE.Scene): {
  update: (time: number) => void
  dispose: () => void
} {
  const shader = new ShaderName({ color: 0xff0000, speed: 1.0 })

  const geometry = new THREE.SphereGeometry(1, 32, 32)
  const mesh = new THREE.Mesh(geometry, shader.get())
  scene.add(mesh)

  function update(time: number) {
    shader.update(time)
  }

  function dispose() {
    scene.remove(mesh)
    geometry.dispose()
    shader.dispose()
  }

  return { update, dispose }
}
