/**
 * VỊ TRÍ   — threejs-modules/shaders/WindAnimation/index.ts
 * VAI TRÒ  — Vertex displacement shader giả lập gió dùng triNoise3D
 * LIÊN HỆ  — Cùng kỹ thuật với WorldNoise nhưng áp dụng positionNode thay vì colorNode
 *
 * CÁCH DÙNG:
 *   const wind = new WindAnimation({ strength: 0.3, frequency: 0.8 })
 *   mesh.material = wind.getMaterial()
 *   // animation loop:
 *   wind.update(clock.getElapsedTime())
 *
 * DISPOSE: wind.dispose() — chỉ dispose material, không dispose geometry
 */

import { NodeMaterial } from 'three/webgpu'
import { color, positionLocal, triNoise3D, uniform, vec3 } from 'three/tsl'
import type * as THREE from 'three'

export interface WindAnimationOptions {
  /** Displacement amplitude in object units. Default: 0.3 */
  strength?: number
  /** Noise spatial frequency — larger = more turbulent. Default: 0.8 */
  frequency?: number
  /** Animation speed multiplier. Default: 1.0 */
  speed?: number
  /** Base color for the material. Default: 0x44aa44 */
  baseColor?: THREE.ColorRepresentation
}

export class WindAnimation {
  private material: NodeMaterial | null = null
  private readonly uTime = uniform(0)
  private readonly uStrength = uniform(0.3)
  private readonly uFreq = uniform(0.8)
  private readonly uSpeed = uniform(1.0)
  private isDisposed = false

  constructor(opts: WindAnimationOptions = {}) {
    this.uStrength.value = opts.strength ?? 0.3
    this.uFreq.value = opts.frequency ?? 0.8
    this.uSpeed.value = opts.speed ?? 1.0

    // Object-space sampling — avoids circular dependency when positionWorld depends on positionNode
    const scaledPos = positionLocal.mul(this.uFreq)
    // Two uncorrelated noise samples via offset constant
    const n1 = triNoise3D(scaledPos, this.uSpeed, this.uTime)
    const n2 = triNoise3D(scaledPos.add(vec3(17.3, 5.7, 11.9)), this.uSpeed, this.uTime)

    // Remap [0,1] → [-0.5, 0.5] then scale by strength
    const dx = n1.sub(0.5).mul(this.uStrength)
    const dz = n2.sub(0.5).mul(this.uStrength)
    // Minimal vertical movement — prevents floating look
    const dy = n1.add(n2).mul(0.5).sub(0.5).mul(this.uStrength).mul(0.3)

    const mat = new NodeMaterial()
    mat.positionNode = positionLocal.add(vec3(dx, dy, dz))
    mat.colorNode = color(opts.baseColor ?? 0x44aa44)
    this.material = mat
  }

  /** Gọi mỗi frame — time = clock.getElapsedTime() */
  update(time: number): void {
    if (this.isDisposed) return
    this.uTime.value = time
  }

  /** Cường độ gió — 0 = không gió, giá trị lớn = mạnh hơn */
  setStrength(value: number): void {
    if (this.isDisposed) return
    this.uStrength.value = Math.max(0, value)
  }

  /** Tần số không gian — giá trị lớn = nhiễu nhỏ hơn, gió rối hơn */
  setFrequency(value: number): void {
    if (this.isDisposed) return
    this.uFreq.value = Math.max(0.001, value)
  }

  getMaterial(): NodeMaterial {
    if (!this.material) throw new Error('WindAnimation: already disposed')
    return this.material
  }

  dispose(): void {
    if (this.isDisposed) return
    this.material?.dispose()
    this.material = null
    this.isDisposed = true
  }
}
