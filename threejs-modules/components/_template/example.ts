import * as THREE from 'three'

import { ComponentName } from './index'

// Minimal example — copy và đổi ComponentName thành tên module thật
export function createExample(scene: THREE.Scene): {
  update: (time: number) => void
  dispose: () => void
} {
  const component = new ComponentName({ position: new THREE.Vector3(0, 0, 0) })
  scene.add(component.mesh)

  function update(time: number) {
    component.update(time)
  }

  function dispose() {
    scene.remove(component.mesh)
    component.dispose()
  }

  return { update, dispose }
}
