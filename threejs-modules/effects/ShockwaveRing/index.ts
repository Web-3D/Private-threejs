/**
 * VỊ TRÍ   — threejs-modules/effects/ShockwaveRing/index.ts
 * VAI TRÒ  — Ring mở rộng + fade khi impact/explosion. Lifecycle: play() → update() → isComplete
 * LIÊN HỆ  — Extends BaseGPUEffect. Caller kiểm tra isComplete để dispose hoặc play() lại
 *
 * CÁCH DÙNG:
 *   const ring = new ShockwaveRing({ color: 0xff8800, maxScale: 4 })
 *   scene.add(ring.root)
 *   ring.play(clock.getElapsedTime())   // trigger tại thời điểm impact
 *   // mỗi frame:
 *   ring.update(clock.getElapsedTime())
 *   if (ring.isComplete) ring.dispose() // hoặc play() lại để reuse
 *
 * DISPOSE: geo + mat.
 */

import * as THREE from 'three'
import { BaseGPUEffect } from '../BaseGPUEffect'

export interface ShockwaveRingOptions {
  /** Outer radius (world units). Default: 0.5 */
  radius?: number
  /** Ring tube thickness (world units). Default: 0.04 */
  thickness?: number
  /** Scale multiplier tại cuối lifetime. Default: 3.0 */
  maxScale?: number
  /** Duration seconds. Default: 0.8 */
  lifetime?: number
  /** Ring color. Default: 0xffffff */
  color?: THREE.ColorRepresentation
}

export class ShockwaveRing extends BaseGPUEffect {
  private readonly geo: THREE.RingGeometry
  private readonly mat: THREE.MeshBasicMaterial
  readonly root: THREE.Mesh
  private readonly lifetime: number
  private readonly maxScale: number
  private startTime = -1
  /** True khi animation kết thúc — caller có thể dispose() hoặc play() lại */
  isComplete = false

  constructor(opts: ShockwaveRingOptions = {}) {
    super()
    const radius = opts.radius ?? 0.5
    const thickness = opts.thickness ?? 0.04
    this.lifetime = opts.lifetime ?? 0.8
    this.maxScale = opts.maxScale ?? 3.0

    this.geo = new THREE.RingGeometry(Math.max(0, radius - thickness), radius, 64)
    this.mat = new THREE.MeshBasicMaterial({
      color: opts.color ?? 0xffffff,
      transparent: true,
      opacity: 0,
      depthWrite: false,
      side: THREE.DoubleSide,
    })
    this.root = new THREE.Mesh(this.geo, this.mat)
    // Nằm ngang trên mặt phẳng XZ (ground plane)
    this.root.rotation.x = -Math.PI / 2
    this.root.visible = false
  }

  /** Kích hoạt animation. time = clock.getElapsedTime() tại thời điểm impact. */
  play(time: number): void {
    if (this.isDisposed) return
    this.startTime = time
    this.isComplete = false
    this.root.scale.setScalar(0.001)
    this.mat.opacity = 1
    this.root.visible = true
  }

  /** Gọi mỗi frame. time = clock.getElapsedTime(). */
  update(time: number): void {
    if (this.isDisposed || this.startTime < 0) return
    const t = Math.min((time - this.startTime) / this.lifetime, 1)
    this.root.scale.setScalar(Math.max(0.001, this.maxScale * t))
    // Ease-out: opacity giảm nhanh hơn ở cuối
    this.mat.opacity = 1 - t * t
    if (t >= 1) {
      this.isComplete = true
      this.root.visible = false
    }
  }

  protected onDispose(): void {
    this.geo.dispose()
    this.mat.dispose()
  }
}
