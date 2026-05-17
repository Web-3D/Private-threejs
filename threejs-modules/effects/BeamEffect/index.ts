/**
 * VỊ TRÍ   — threejs-modules/effects/BeamEffect/index.ts
 * VAI TRÒ  — Line từ điểm A đến B — laser, lightning, connection, rope
 * LIÊN HỆ  — Extends BaseGPUEffect. Gọi update(start, end) mỗi frame để reposition
 *
 * CÁCH DÙNG:
 *   const beam = new BeamEffect({ color: 0x00ffff, radius: 0.02 })
 *   scene.add(beam.root)
 *   // mỗi frame:
 *   beam.update(pointA, pointB)
 *
 * DISPOSE: geo + mat.
 */

import * as THREE from 'three'
import { BaseGPUEffect } from '../BaseGPUEffect'

export interface BeamEffectOptions {
  /** Beam cylinder radius (world units). Default: 0.02 */
  radius?: number
  /** Beam color. Default: 0x00ffff */
  color?: THREE.ColorRepresentation
  /** Opacity 0–1. Default: 1.0 */
  opacity?: number
  /** Additive blending cho laser/glow effect. Default: false */
  additive?: boolean
}

export class BeamEffect extends BaseGPUEffect {
  private readonly geo: THREE.CylinderGeometry
  private readonly mat: THREE.MeshBasicMaterial
  readonly root: THREE.Mesh
  // Reusable vectors — tránh heap allocation mỗi frame
  private readonly _dir = new THREE.Vector3()
  private readonly _mid = new THREE.Vector3()
  private readonly _q = new THREE.Quaternion()
  private static readonly _UP = new THREE.Vector3(0, 1, 0)

  constructor(opts: BeamEffectOptions = {}) {
    super()
    const radius = opts.radius ?? 0.02
    const opacity = opts.opacity ?? 1.0
    // height = 1 — root.scale.y được set mỗi frame theo khoảng cách thực tế
    this.geo = new THREE.CylinderGeometry(radius, radius, 1, 8, 1, false)
    this.mat = new THREE.MeshBasicMaterial({
      color: opts.color ?? 0x00ffff,
      transparent: opacity < 1.0,
      opacity,
      depthWrite: false,
      blending: opts.additive ? THREE.AdditiveBlending : THREE.NormalBlending,
    })
    this.root = new THREE.Mesh(this.geo, this.mat)
  }

  /**
   * Cập nhật vị trí và hướng beam mỗi frame.
   * Tự ẩn khi start === end (khoảng cách < 0.0001).
   */
  update(start: THREE.Vector3, end: THREE.Vector3): void {
    if (this.isDisposed) return

    this._dir.subVectors(end, start)
    const length = this._dir.length()
    if (length < 0.0001) {
      this.root.visible = false
      return
    }

    this._mid.addVectors(start, end).multiplyScalar(0.5)
    this.root.position.copy(this._mid)
    this.root.scale.y = length
    this._dir.divideScalar(length) // normalize in-place, không tạo Vector3 mới
    this._q.setFromUnitVectors(BeamEffect._UP, this._dir)
    this.root.quaternion.copy(this._q)
    this.root.visible = true
  }

  setColor(value: THREE.ColorRepresentation): void {
    if (this.isDisposed) return
    this.mat.color.set(value)
  }

  protected onDispose(): void {
    this.geo.dispose()
    this.mat.dispose()
  }
}
