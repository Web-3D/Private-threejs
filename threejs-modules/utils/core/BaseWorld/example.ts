import * as THREE from 'three'
import { BaseWorld } from './index'

// Concrete subclass: khối lập phương wireframe xoay
// So sánh với example.ts thông thường: createDemo giảm từ ~40 dòng xuống 3 dòng
class RotatingCubeDemo extends BaseWorld {
  private mesh: THREE.Mesh | null = null

  protected async onInit(): Promise<void> {
    this.scene.background = new THREE.Color(0x111111)
    this.camera.position.set(0, 1, 4)
    const geo = new THREE.BoxGeometry()
    const mat = new THREE.MeshBasicMaterial({ color: 0x4488ff, wireframe: true })
    this.mesh = new THREE.Mesh(geo, mat)
    this.scene.add(this.mesh)
  }

  protected onUpdate(time: number): void {
    if (!this.mesh) return
    this.mesh.rotation.x = time * 0.5
    this.mesh.rotation.y = time * 0.8
  }

  protected onDispose(): void {
    if (!this.mesh) return
    this.mesh.geometry.dispose()
    ;(this.mesh.material as THREE.Material).dispose()
  }
}

export async function createDemo(canvas: HTMLCanvasElement): Promise<{ dispose(): void }> {
  const demo = new RotatingCubeDemo(canvas)
  await demo.init()
  return { dispose: () => demo.dispose() }
}
