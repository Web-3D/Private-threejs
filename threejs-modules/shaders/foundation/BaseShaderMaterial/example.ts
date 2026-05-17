import * as THREE from 'three'
import { NodeMaterial } from 'three/webgpu'
import { WebGPURenderer } from 'three/webgpu'
import { color, mix, uniform } from 'three/tsl'
import { BaseShaderMaterial } from './index'

// Concrete subclass: lerp giữa 2 màu theo uniform uBlend [0..1]
// Demo này cố tình đơn giản — chỉ cần extend + gán this.material là đủ
class GradientShader extends BaseShaderMaterial {
  private readonly uBlend = uniform(0.0)

  constructor(from: THREE.ColorRepresentation, to: THREE.ColorRepresentation) {
    super()
    // uBlend đã được khởi tạo bởi field initializer sau super() trả về
    const mat = new NodeMaterial()
    mat.colorNode = mix(color(from), color(to), this.uBlend)
    this.material = mat
  }

  setBlend(t: number): void {
    if (this.isDisposed) return
    this.uBlend.value = Math.max(0, Math.min(1, t))
  }
}

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
  camera.position.set(0, 0, 3)

  const gradient = new GradientShader(0xff4400, 0x0044ff)
  const geo = new THREE.TorusKnotGeometry(0.8, 0.25, 64, 16)
  const mesh = new THREE.Mesh(geo, gradient.getMaterial())
  scene.add(mesh)

  const clock = new THREE.Clock()

  renderer.setAnimationLoop(() => {
    const t = clock.getElapsedTime()
    gradient.setBlend(Math.sin(t * 1.5) * 0.5 + 0.5)
    mesh.rotation.y += 0.01
    renderer.render(scene, camera)
  })

  return {
    dispose() {
      renderer.setAnimationLoop(null)
      gradient.dispose()
      geo.dispose()
      renderer.dispose()
    },
  }
}
