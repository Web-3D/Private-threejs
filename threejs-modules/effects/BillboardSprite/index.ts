/**
 * VỊ TRÍ   — threejs-modules/effects/BillboardSprite/index.ts
 * VAI TRÒ  — Sprite luôn quay về camera — icon, marker, glow, health indicator
 * LIÊN HỆ  — Extends BaseGPUEffect. Caller sở hữu opts.map — không dispose texture trong class
 *
 * CÁCH DÙNG:
 *   const sprite = new BillboardSprite({ map: texture, size: 0.5, color: 0xffaa00 })
 *   scene.add(sprite.root)
 *   // mỗi frame — sau khi camera đã cập nhật vị trí:
 *   sprite.update(camera)
 *
 * DISPOSE: geo + mat. Texture do caller dispose.
 */

import * as THREE from 'three'
import { BaseGPUEffect } from '../BaseGPUEffect'

export interface BillboardSpriteOptions {
  /** Texture. Caller sở hữu — BillboardSprite không dispose texture này. */
  map?: THREE.Texture
  /** Cạnh sprite (world units). Default: 1.0 */
  size?: number
  /** Tint color. Default: 0xffffff */
  color?: THREE.ColorRepresentation
  /** Opacity 0–1. Default: 1.0 */
  opacity?: number
  /** Additive blending cho glow effect. Default: false */
  additive?: boolean
}

export class BillboardSprite extends BaseGPUEffect {
  private readonly geo: THREE.PlaneGeometry
  private readonly mat: THREE.MeshBasicMaterial
  readonly root: THREE.Mesh

  constructor(opts: BillboardSpriteOptions = {}) {
    super()
    const size = opts.size ?? 1.0
    const opacity = opts.opacity ?? 1.0
    this.geo = new THREE.PlaneGeometry(size, size)
    this.mat = new THREE.MeshBasicMaterial({
      map: opts.map ?? null,
      color: opts.color ?? 0xffffff,
      transparent: true,
      opacity,
      depthWrite: false,
      blending: opts.additive ? THREE.AdditiveBlending : THREE.NormalBlending,
      side: THREE.DoubleSide,
    })
    this.root = new THREE.Mesh(this.geo, this.mat)
  }

  /** Align về camera. Gọi mỗi frame sau khi camera đã di chuyển. */
  update(camera: THREE.Camera): void {
    if (this.isDisposed) return
    this.root.quaternion.copy(camera.quaternion)
  }

  setOpacity(value: number): void {
    if (this.isDisposed) return
    this.mat.opacity = Math.max(0, Math.min(1, value))
  }

  setColor(value: THREE.ColorRepresentation): void {
    if (this.isDisposed) return
    this.mat.color.set(value)
  }

  protected onDispose(): void {
    this.geo.dispose()
    this.mat.dispose()
    // opts.map KHÔNG dispose ở đây — caller sở hữu texture
  }
}
