import { NodeMaterial } from 'three/webgpu'
import { normalWorld, positionWorld, texture, triplanarTextures, uniform } from 'three/tsl'
import type * as THREE from 'three'

export interface TriplanarMappingOptions {
  map: THREE.Texture
  /** World-space texture scale. Giá trị lớn = texture nhỏ hơn trên surface. Default: 1.0 */
  scale?: number
}

export class TriplanarMapping {
  private material: NodeMaterial | null = null
  private readonly uScale = uniform(1.0)
  private isDisposed = false

  constructor(opts: TriplanarMappingOptions) {
    this.uScale.value = opts.scale ?? 1.0

    // Dùng 1 texture cho cả 3 mặt phẳng — triplanarTextures yêu cầu explicit, không dùng null
    const texNode = texture(opts.map)
    const mat = new NodeMaterial()
    mat.colorNode = triplanarTextures(
      texNode,       // mặt YZ (nhìn từ trái/phải)
      texNode,       // mặt ZX (nhìn từ trên/dưới)
      texNode,       // mặt XY (nhìn từ trước/sau)
      this.uScale,
      positionWorld, // world-space: texture cố định trong không gian, không xoay theo mesh
      normalWorld
    )
    this.material = mat
  }

  /** Đổi scale runtime — không cần tạo lại material */
  setScale(value: number): void {
    if (this.isDisposed) return
    this.uScale.value = Math.max(0.001, value)
  }

  getMaterial(): NodeMaterial {
    if (!this.material) throw new Error('TriplanarMapping: already disposed')
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
