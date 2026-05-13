/**
 * VỊ TRÍ  : threejs-modules/shaders/ProceduralFracture/index.ts
 * VAI TRÒ : Vertex displacement dọc theo normal bằng triNoise3D — giả lập vết nứt/fracture
 * DÙNG KHI: Tường nứt, đá vỡ, mặt đất rạn — không cần bake texture, dynamic runtime
 */

import { NodeMaterial } from 'three/webgpu'
import { color, mix, normalLocal, positionLocal, positionWorld, triNoise3D, uniform } from 'three/tsl'
import type * as THREE from 'three'

export interface ProceduralFractureOptions {
  intensity?: number
  scale?: number
  speed?: number
  color1?: THREE.ColorRepresentation
  color2?: THREE.ColorRepresentation
}

export class ProceduralFracture {
  private material: NodeMaterial | null = null
  private readonly uTime = uniform(0)
  private readonly uIntensity = uniform(0.1)
  private readonly uScale = uniform(2.0)
  private readonly uSpeed = uniform(0.3)
  private isDisposed = false

  constructor(opts: ProceduralFractureOptions = {}) {
    this.uIntensity.value = opts.intensity ?? 0.1
    this.uScale.value = opts.scale ?? 2.0
    this.uSpeed.value = opts.speed ?? 0.3

    const noiseVal = triNoise3D(positionWorld.mul(this.uScale), this.uSpeed, this.uTime)

    const mat = new NodeMaterial()
    mat.positionNode = positionLocal.add(normalLocal.mul(noiseVal.mul(this.uIntensity)))
    mat.colorNode = mix(color(opts.color1 ?? 0x222222), color(opts.color2 ?? 0x888888), noiseVal)
    this.material = mat
  }

  update(time: number): void {
    if (this.isDisposed) return
    this.uTime.value = time
  }

  setIntensity(value: number): void {
    if (this.isDisposed) return
    this.uIntensity.value = Math.max(0, value)
  }

  setScale(value: number): void {
    if (this.isDisposed) return
    this.uScale.value = Math.max(0.001, value)
  }

  getMaterial(): NodeMaterial {
    if (!this.material) throw new Error('ProceduralFracture: already disposed')
    return this.material
  }

  dispose(): void {
    if (this.isDisposed) return
    this.material?.dispose()
    this.material = null
    this.isDisposed = true
  }
}
