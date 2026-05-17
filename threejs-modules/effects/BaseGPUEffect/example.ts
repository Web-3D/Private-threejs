import * as THREE from 'three'
import { WebGPURenderer } from 'three/webgpu'
import { BaseGPUEffect } from './index'

// Concrete subclass: 3 ring xoay quanh origin
// Demo này cố tình đơn giản để thấy rõ pattern extend + onDispose
class OrbitRings extends BaseGPUEffect {
  readonly root = new THREE.Group()
  private readonly geos: THREE.TorusGeometry[] = []
  private readonly mats: THREE.MeshBasicMaterial[] = []

  constructor(colors: THREE.ColorRepresentation[]) {
    super()
    colors.forEach((c, i) => {
      const geo = new THREE.TorusGeometry(0.8 + i * 0.3, 0.015, 8, 64)
      const mat = new THREE.MeshBasicMaterial({ color: c })
      this.geos.push(geo)
      this.mats.push(mat)
      this.root.add(new THREE.Mesh(geo, mat))
    })
  }

  update(time: number): void {
    if (this.isDisposed) return
    this.root.children.forEach((child, i) => {
      child.rotation.x = time * (0.4 + i * 0.15)
      child.rotation.y = time * (0.6 + i * 0.1)
    })
  }

  protected onDispose(): void {
    this.geos.forEach(g => g.dispose())
    this.mats.forEach(m => m.dispose())
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
  scene.background = new THREE.Color(0x0a0a0a)
  const camera = new THREE.PerspectiveCamera(60, w / h, 0.1, 100)
  camera.position.set(0, 0, 4)

  const rings = new OrbitRings([0xff4400, 0x00aaff, 0xffcc00])
  scene.add(rings.root)

  const clock = new THREE.Clock()

  renderer.setAnimationLoop(() => {
    rings.update(clock.getElapsedTime())
    renderer.render(scene, camera)
  })

  return {
    dispose() {
      renderer.setAnimationLoop(null)
      rings.dispose()
      renderer.dispose()
    },
  }
}
