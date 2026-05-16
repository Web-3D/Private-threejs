/**
 * VỊ TRÍ   — threejs-modules/shaders/VATShader/index.ts
 * VAI TRÒ  — Vertex Animation Texture shader — đọc animation baked trong DataTexture, reconstruct trên GPU
 * LIÊN HỆ  — CharacterPool dùng material này; GlobalUniforms.inject() nếu sync uTime toàn scene
 *
 * CÁCH DÙNG:
 *   const vat = new VATShader({ positionTexture, frameCount: 30, frameRate: 24 })
 *   mesh.material = vat.getMaterial()
 *   // trong animation loop:
 *   vat.update(elapsedSeconds)
 *   vat.dispose()
 *
 * DISPOSE: material.dispose() — positionTexture và normalTexture KHÔNG dispose (caller sở hữu)
 */

import * as THREE from 'three'
import { NodeMaterial } from 'three/webgpu'
import { float, texture, uniform, vec2, vertexIndex } from 'three/tsl'

export interface VATShaderOptions {
  /** DataTexture: width = vertexCount, height = frameCount, format RGBA + FloatType/HalfFloatType */
  positionTexture: THREE.DataTexture
  /** Optional — same dimensions. Khi không có, mesh dùng normal từ geometry (flat shading). */
  normalTexture?: THREE.DataTexture
  /** Tổng số frame đã bake vào texture. */
  frameCount: number
  /** FPS playback. Default 24. */
  frameRate?: number
}

export class VATShader {
  private material: NodeMaterial | null = null
  private readonly uFrame = uniform(0)
  private readonly frameCount: number
  private readonly frameRate: number
  private isDisposed = false

  constructor(opts: VATShaderOptions) {
    this.frameCount = opts.frameCount
    this.frameRate = opts.frameRate ?? 24

    const texW = float(opts.positionTexture.image.width)
    const texH = float(opts.positionTexture.image.height)

    // Center-of-pixel UV: (index + 0.5) / dimension — tránh bleeding giữa các pixel
    const u = vertexIndex.toFloat().add(0.5).div(texW)
    const v = this.uFrame.add(0.5).div(texH)
    const sampleUV = vec2(u, v)

    const mat = new NodeMaterial()
    mat.positionNode = texture(opts.positionTexture, sampleUV).xyz

    if (opts.normalTexture) {
      mat.normalNode = texture(opts.normalTexture, sampleUV).xyz.normalize()
    }
    // Không có normalTexture → geometry normals giữ nguyên (không khớp với animated positions,
    // nhưng đủ cho prototype. Pass normalTexture để có lighting chính xác.)

    this.material = mat
  }

  /**
   * Advance animation theo elapsed time.
   * Gọi mỗi frame trong animation loop.
   */
  update(time: number): void {
    if (this.isDisposed) return
    this.uFrame.value = Math.floor(time * this.frameRate) % this.frameCount
  }

  /** Nhảy trực tiếp đến frame index cụ thể [0, frameCount-1]. */
  setFrame(frame: number): void {
    if (this.isDisposed) return
    this.uFrame.value = Math.max(0, Math.min(this.frameCount - 1, Math.floor(frame)))
  }

  getMaterial(): NodeMaterial {
    if (!this.material) throw new Error('VATShader: already disposed')
    return this.material
  }

  dispose(): void {
    if (this.isDisposed) return
    this.material?.dispose()
    this.material = null
    this.isDisposed = true
    // positionTexture + normalTexture KHÔNG dispose ở đây — caller sở hữu
  }
}
