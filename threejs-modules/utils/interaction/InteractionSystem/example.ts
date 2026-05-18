/**
 * VỊ TRÍ  : threejs-modules/utils/InteractionSystem/example.ts
 * VAI TRÒ : Demo visual — 3 hộp click/hover đổi màu
 */

import * as THREE from 'three'
import { WebGPURenderer } from 'three/webgpu'
import { InteractionSystem } from './index'

export async function createDemo(canvas: HTMLCanvasElement): Promise<() => void> {
  const renderer = new WebGPURenderer({ canvas, antialias: true })
  await renderer.init()
  renderer.setSize(canvas.clientWidth, canvas.clientHeight)

  const scene = new THREE.Scene()
  scene.background = new THREE.Color(0x111111)

  const camera = new THREE.PerspectiveCamera(60, canvas.clientWidth / canvas.clientHeight, 0.1, 100)
  camera.position.set(0, 0, 5)

  // 3 hộp — màu base
  const colors = [0xff4444, 0x44ff44, 0x4444ff]
  const meshes = colors.map((color, i) => {
    const geo = new THREE.BoxGeometry(0.8, 0.8, 0.8)
    const mat = new THREE.MeshStandardMaterial({ color })
    const mesh = new THREE.Mesh(geo, mat)
    mesh.position.x = (i - 1) * 2
    scene.add(mesh)
    return mesh
  })

  const light = new THREE.DirectionalLight(0xffffff, 2)
  light.position.set(3, 5, 3)
  scene.add(light)
  scene.add(new THREE.AmbientLight(0xffffff, 0.4))

  const interaction = new InteractionSystem({ camera, canvas })

  meshes.forEach((mesh, i) => {
    const mat = mesh.material as THREE.MeshStandardMaterial
    const baseColor = colors[i]
    interaction.add(mesh, {
      onPointerEnter: () => mat.emissive.set(0x333333),
      onPointerLeave: () => mat.emissive.set(0x000000),
      onClick: e => {
        console.log(`[InteractionSystem] clicked mesh ${i} at`, e.point)
        mat.color.set(Math.random() * 0xffffff)
        setTimeout(() => mat.color.set(baseColor), 500)
      },
    })
  })

  let rafId: number
  function animate() {
    rafId = requestAnimationFrame(animate)
    meshes.forEach((m, i) => { m.rotation.y += 0.005 * (i + 1) })
    interaction.update()
    renderer.render(scene, camera)
  }
  animate()

  return () => {
    cancelAnimationFrame(rafId)
    interaction.dispose()
    meshes.forEach(m => {
      m.geometry.dispose()
      ;(m.material as THREE.Material).dispose()
    })
    renderer.dispose()
  }
}
