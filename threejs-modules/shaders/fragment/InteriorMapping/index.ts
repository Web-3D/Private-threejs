/**
 * VỊ TRÍ  : threejs-modules/shaders/InteriorMapping/index.ts
 * VAI TRÒ : Giả lập phòng nội thất bên trong building window — ray parallax trick
 * DÙNG KHI: Cửa sổ building, panel kính — 1 texture thay thế hàng trăm mesh nội thất
 */

import { NodeMaterial } from 'three/webgpu'
import {
  Fn, bitangentWorld, cameraPosition, clamp, dot, float, fract,
  mix, normalWorld, positionWorld, sin, step, tangentWorld,
  texture, uniform, uv, vec2,
} from 'three/tsl'
import type * as THREE from 'three'

export interface InteriorMappingOptions {
  map: THREE.Texture
  tiling?: number
  depth?: number
}

export class InteriorMapping {
  private material: NodeMaterial | null = null
  private readonly uTiling = uniform(1.0)
  private readonly uDepth = uniform(0.5)
  private isDisposed = false

  constructor(opts: InteriorMappingOptions) {
    this.uTiling.value = opts.tiling ?? 1
    this.uDepth.value = opts.depth ?? 0.5

    const uTiling = this.uTiling
    const uDepth = this.uDepth
    const roomMap = opts.map

    const interiorNode = Fn(() => {
      // Per-room UV tiling
      const tiledUV = uv().mul(uTiling)
      const roomUV = tiledUV.fract()
      const roomIdx = tiledUV.floor()

      // Per-room variation: hash index → horizontal flip + vertical offset
      const seed = fract(sin(roomIdx.x.add(roomIdx.y.mul(float(137.0)))).mul(float(43758.5)))
      const flipX = step(float(0.5), seed)
      const offsetY = fract(sin(roomIdx.x.mul(float(59.0)).add(roomIdx.y.mul(float(83.0)))).mul(float(21341.5))).sub(float(0.5)).mul(float(0.3))

      const variedUV = vec2(
        mix(roomUV.x, roomUV.x.oneMinus(), flipX),
        clamp(roomUV.y.add(offsetY), float(0.0), float(1.0))
      )

      // Parallax: project view direction onto surface tangent space
      const viewDir = cameraPosition.sub(positionWorld).normalize()
      const tComp = dot(viewDir, tangentWorld)
      const bComp = dot(viewDir, bitangentWorld)
      const nComp = dot(viewDir, normalWorld).abs().add(float(0.001))

      const parallax = vec2(tComp, bComp).div(nComp).mul(uDepth).negate()

      const finalUV = clamp(variedUV.add(parallax), float(0.0), float(1.0))

      return texture(roomMap, finalUV)
    })

    const mat = new NodeMaterial()
    mat.colorNode = interiorNode()
    this.material = mat
  }

  setDepth(value: number): void {
    if (this.isDisposed) return
    this.uDepth.value = Math.max(0.01, value)
  }

  setTiling(value: number): void {
    if (this.isDisposed) return
    this.uTiling.value = Math.max(1, Math.round(value))
  }

  getMaterial(): NodeMaterial {
    if (!this.material) throw new Error('InteriorMapping: already disposed')
    return this.material
  }

  dispose(): void {
    if (this.isDisposed) return
    this.material?.dispose()
    this.material = null
    this.isDisposed = true
    // opts.map KHÔNG dispose ở đây — caller sở hữu texture
  }
}
