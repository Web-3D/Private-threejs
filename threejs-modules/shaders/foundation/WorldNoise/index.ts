import { NodeMaterial } from 'three/webgpu'
import { color, mix, positionWorld, triNoise3D, uniform } from 'three/tsl'
import type * as THREE from 'three'

export interface WorldNoiseOptions {
  /** Animation speed multiplier. Default: 1.0 */
  speed?: number
  /** World-space scale — larger value = smaller noise features. Default: 1.0 */
  scale?: number
  /** Color at noise minimum. Default: 0x000000 */
  color1?: THREE.ColorRepresentation
  /** Color at noise maximum. Default: 0xffffff */
  color2?: THREE.ColorRepresentation
}

export class WorldNoise {
  private material: NodeMaterial | null = null
  private readonly uTime = uniform(0)
  private readonly uSpeed = uniform(1.0)
  private readonly uScale = uniform(1.0)
  private isDisposed = false

  constructor(opts: WorldNoiseOptions = {}) {
    this.uSpeed.value = opts.speed ?? 1.0
    this.uScale.value = opts.scale ?? 1.0

    const scaledPos = positionWorld.mul(this.uScale)
    const noiseVal = triNoise3D(scaledPos, this.uSpeed, this.uTime)
    const c1 = color(opts.color1 ?? 0x000000)
    const c2 = color(opts.color2 ?? 0xffffff)

    const mat = new NodeMaterial()
    mat.colorNode = mix(c1, c2, noiseVal)
    this.material = mat
  }

  /** Gọi mỗi frame — time = clock.getElapsedTime() */
  update(time: number): void {
    if (this.isDisposed) return
    this.uTime.value = time
  }

  setScale(value: number): void {
    if (this.isDisposed) return
    this.uScale.value = Math.max(0.001, value)
  }

  setSpeed(value: number): void {
    if (this.isDisposed) return
    this.uSpeed.value = Math.max(0, value)
  }

  getMaterial(): NodeMaterial {
    if (!this.material) throw new Error('WorldNoise: already disposed')
    return this.material
  }

  dispose(): void {
    if (this.isDisposed) return
    this.material?.dispose()
    this.material = null
    this.isDisposed = true
  }
}
