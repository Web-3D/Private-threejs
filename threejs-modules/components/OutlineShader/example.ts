import * as THREE from 'three'
import { WebGPURenderer } from 'three/webgpu'
import { OutlineShader } from './index'

export async function createDemo(canvas: HTMLCanvasElement): Promise<{ dispose(): void }> {
  const w = canvas.clientWidth || 300
  const h = canvas.clientHeight || 200

  const renderer = new WebGPURenderer({ canvas, antialias: true })
  renderer.setPixelRatio(1)
  renderer.setSize(w, h)
  await renderer.init()

  const scene = new THREE.Scene()
  scene.background = new THREE.Color(0x111111)

  const camera = new THREE.PerspectiveCamera(60, w / h, 0.1, 100)
  camera.position.set(0, 1, 5)
  camera.lookAt(0, 0, 0)

  scene.add(new THREE.AmbientLight(0xffffff, 0.6))
  const dir = new THREE.DirectionalLight(0xffffff, 1.2)
  dir.position.set(3, 4, 2)
  scene.add(dir)

  const geo = new THREE.BoxGeometry(1.5, 1.5, 1.5)
  const mat = new THREE.MeshStandardMaterial({ color: 0x334466 })
  const box = new THREE.Mesh(geo, mat)
  scene.add(box)

  const outline = new OutlineShader(box, { color: 0x00ffcc, thickness: 0.04 })

  // Pulse outline color between two hues
  let hue = 0
  const clock = new THREE.Clock()

  renderer.setAnimationLoop(() => {
    const t = clock.getElapsedTime()
    hue = (Math.sin(t * 1.5) * 0.5 + 0.5) * 0.2  // 0.0 – 0.2 hue range
    outline.setColor(new THREE.Color().setHSL(hue, 1, 0.6))

    box.rotation.y += 0.008
    box.rotation.x += 0.003
    renderer.render(scene, camera)
  })

  return {
    dispose() {
      renderer.setAnimationLoop(null)
      outline.dispose()
      geo.dispose()
      mat.dispose()
      renderer.dispose()
    },
  }
}
