import * as THREE from 'three'
import { WebGPURenderer } from 'three/webgpu'
import { FireSystem } from './index'

export async function createDemo(canvas: HTMLCanvasElement): Promise<{ dispose(): void }> {
  const w = canvas.clientWidth || 300
  const h = canvas.clientHeight || 200

  const renderer = new WebGPURenderer({ canvas, antialias: true })
  renderer.setPixelRatio(1)
  renderer.setSize(w, h)
  await renderer.init()

  const scene = new THREE.Scene()
  scene.background = new THREE.Color(0x0a0a0a)

  const camera = new THREE.PerspectiveCamera(60, w / h, 0.1, 100)
  camera.position.set(0, 2, 6)
  camera.lookAt(0, 2, 0)

  // Ground plane
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(6, 6),
    new THREE.MeshBasicMaterial({ color: 0x111111 }),
  )
  ground.rotation.x = -Math.PI / 2
  scene.add(ground)

  const fire = new FireSystem({ count: 400 })
  scene.add(fire.group)

  // Wind demo — slow drift
  let windAngle = 0
  const clock = new THREE.Clock()

  renderer.setAnimationLoop(() => {
    const t = clock.getElapsedTime()
    windAngle += 0.005
    fire.setWind(Math.sin(windAngle) * 0.3, Math.cos(windAngle * 0.7) * 0.1)
    fire.update(t)
    renderer.render(scene, camera)
  })

  return {
    dispose() {
      renderer.setAnimationLoop(null)
      fire.dispose()
      ground.geometry.dispose()
      ;(ground.material as THREE.Material).dispose()
      renderer.dispose()
    },
  }
}
