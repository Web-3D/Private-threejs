import * as THREE from 'three'
import { BaseWorld } from '../../utils/core/BaseWorld'
import { ShockwaveRing } from './index'

class ShockwaveDemo extends BaseWorld {
  private ring: ShockwaveRing | null = null
  private lastTrigger = 0
  private readonly groundGeo = new THREE.PlaneGeometry(10, 10)
  private readonly groundMat = new THREE.MeshBasicMaterial({ color: 0x111111 })

  protected async onInit(): Promise<void> {
    this.scene.background = new THREE.Color(0x0a0a0a)
    this.camera.position.set(0, 5, 8)
    this.camera.lookAt(0, 0, 0)

    const ground = new THREE.Mesh(this.groundGeo, this.groundMat)
    ground.rotation.x = -Math.PI / 2
    this.scene.add(ground)

    this.ring = new ShockwaveRing({
      color: 0xff8800,
      radius: 0.5,
      thickness: 0.05,
      maxScale: 6,
      lifetime: 1.0,
    })
    this.scene.add(this.ring.root)
  }

  protected onUpdate(time: number, _dt: number): void {
    if (!this.ring) return
    // Trigger mới mỗi 1.5 giây
    if (time - this.lastTrigger > 1.5) {
      this.ring.play(time)
      this.lastTrigger = time
    }
    this.ring.update(time)
  }

  protected onDispose(): void {
    this.ring?.dispose()
    this.groundGeo.dispose()
    this.groundMat.dispose()
  }
}

export async function createDemo(canvas: HTMLCanvasElement): Promise<{ dispose(): void }> {
  const demo = new ShockwaveDemo(canvas)
  await demo.init()
  return { dispose: () => demo.dispose() }
}
