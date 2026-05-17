/**
 * VỊ TRÍ   — threejs-modules/effects/BaseGPUEffect/index.ts
 * VAI TRÒ  — Abstract base cho GPU visual effects dùng geometry (không phải particle)
 * LIÊN HỆ  — TrailSystem, LODBillboard dùng cùng pattern
 *             GPUParticleSystem là base riêng cho THREE.Points-based effects
 *
 * CÁCH DÙNG:
 *   class MyEffect extends BaseGPUEffect {
 *     readonly root = new THREE.Group()
 *     private geo = new THREE.BoxGeometry()
 *     private mat = new THREE.MeshBasicMaterial()
 *     constructor() {
 *       super()
 *       this.root.add(new THREE.Mesh(this.geo, this.mat))
 *     }
 *     update(time: number): void { this.root.rotation.y = time }
 *     protected onDispose(): void { this.geo.dispose(); this.mat.dispose() }
 *   }
 *   scene.add(effect.root)
 *   effect.update(clock.getElapsedTime())
 *
 * DISPOSE: gọi dispose() — tự remove root khỏi scene rồi gọi onDispose() của subclass
 */

import * as THREE from 'three'

export abstract class BaseGPUEffect {
  /**
   * Root object thêm vào scene — subclass khai báo kiểu cụ thể (Group, Mesh, Points...).
   * Abstract readonly buộc subclass phải khai báo trước khi dispose() được gọi.
   * Gom tất cả child objects vào root để remove một lần — không add trực tiếp vào scene.
   */
  abstract readonly root: THREE.Object3D

  /** Guard tránh double-dispose. Subclass đọc trực tiếp: if (this.isDisposed) return */
  protected isDisposed = false

  /**
   * Toggle visibility không cần remove/add khỏi scene — zero GPU overhead so với dispose.
   * Dùng để ẩn tạm thời khi effect sẽ được dùng lại — dispose khi không bao giờ dùng lại.
   */
  setVisible(visible: boolean): void {
    if (this.isDisposed) return
    this.root.visible = visible
  }

  /**
   * Subclass override: dispose geometry, material, texture riêng của effect.
   * Hook này được gọi SAU KHI base đã remove root khỏi scene.
   * Pattern chuẩn: this.geo.dispose(); this.mat.dispose()
   */
  protected abstract onDispose(): void

  /**
   * Dispose toàn bộ effect: remove root khỏi scene + gọi onDispose + set isDisposed.
   * Safe to call nhiều lần.
   */
  dispose(): void {
    if (this.isDisposed) return
    this.root.parent?.remove(this.root)
    this.onDispose()
    this.isDisposed = true
  }
}
