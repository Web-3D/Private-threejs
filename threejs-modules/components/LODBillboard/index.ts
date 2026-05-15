/**
 * VỊ TRÍ   — threejs-modules/components/LODBillboard/index.ts
 * VAI TRÒ  — Swap 3D mesh → billboard sprite khi camera xa — tiết kiệm draw call + triangle
 * LIÊN HỆ  — CharacterPool sẽ dùng module này cho mỗi instance trong crowd
 *
 * CÁCH DÙNG:
 *   const lodb = new LODBillboard({ mesh, billboardMap: texture, threshold: 20 })
 *   scene.add(lodb.getLOD())
 *   // THREE.LOD.autoUpdate = true → không cần gọi update() thủ công
 *   lodb.dispose()
 *
 * DISPOSE: spriteMaterial.dispose() — mesh geometry/material và billboardMap KHÔNG dispose (caller sở hữu)
 */

import * as THREE from 'three'

export interface LODBillboardOptions {
  /** Mesh 3D đầy đủ — hiển thị tại khoảng cách gần */
  mesh: THREE.Mesh
  /** Texture cho billboard sprite — hiển thị tại khoảng cách xa */
  billboardMap: THREE.Texture
  /** Kích thước billboard (world units). Nên match chiều cao visual của mesh. Default: 1 */
  billboardScale?: number
  /** Khoảng cách chuyển từ mesh sang billboard. Default: 20 */
  threshold?: number
  /**
   * Hysteresis — ngăn flicker tại ranh giới chuyển LOD.
   * Fraction của distance: 0.1 = ±10% của threshold. Default: 0
   */
  hysteresis?: number
}

export class LODBillboard {
  private lod: THREE.LOD | null = null
  private sprite: THREE.Sprite | null = null
  private spriteMaterial: THREE.SpriteMaterial | null = null
  private isDisposed = false

  constructor(opts: LODBillboardOptions) {
    const threshold = opts.threshold ?? 20
    const hysteresis = opts.hysteresis ?? 0
    const billboardScale = opts.billboardScale ?? 1

    // WebGPURenderer tự upgrade SpriteMaterial → SpriteNodeMaterial qua StandardNodeLibrary
    const mat = new THREE.SpriteMaterial({
      map: opts.billboardMap,
      transparent: true,
      depthWrite: false,
      sizeAttenuation: true,
    })
    const sprite = new THREE.Sprite(mat)
    sprite.scale.setScalar(billboardScale)

    // Level 0 (distance=0): mesh 3D → active khi camera gần
    // Level 1 (distance=threshold): sprite → active khi camera xa
    const lod = new THREE.LOD()
    lod.addLevel(opts.mesh, 0, hysteresis)
    lod.addLevel(sprite, threshold, hysteresis)

    this.lod = lod
    this.sprite = sprite
    this.spriteMaterial = mat
  }

  getLOD(): THREE.LOD {
    if (!this.lod) throw new Error('LODBillboard: already disposed')
    return this.lod
  }

  /** Điều chỉnh kích thước sprite trong world units */
  setBillboardScale(scale: number): void {
    if (this.isDisposed || !this.sprite) return
    this.sprite.scale.setScalar(Math.max(0.001, scale))
  }

  /**
   * Index của level đang active: 0 = mesh 3D, 1 = billboard sprite.
   * Dùng để debug hoặc sync animation state.
   */
  getCurrentLevel(): number {
    return this.lod?.getCurrentLevel() ?? 0
  }

  /** Chỉ gọi khi autoUpdate = false (mặc định autoUpdate = true) */
  update(camera: THREE.Camera): void {
    if (this.isDisposed || !this.lod) return
    this.lod.update(camera)
  }

  dispose(): void {
    if (this.isDisposed) return
    this.lod?.parent?.remove(this.lod)
    this.spriteMaterial?.dispose()
    // mesh geometry/material KHÔNG dispose — caller sở hữu
    // billboardMap KHÔNG dispose — caller sở hữu
    this.lod = null
    this.sprite = null
    this.spriteMaterial = null
    this.isDisposed = true
  }
}
