/**
 * VỊ TRÍ   — threejs-modules/shaders/foundation/BaseShaderMaterial/index.ts
 * VAI TRÒ  — Abstract base cho mọi TSL NodeMaterial shader trong threejs-modules
 * LIÊN HỆ  — DissolveShader, TriplanarMapping, WindAnimation, RoundedCorners dùng cùng pattern này
 *
 * CÁCH DÙNG:
 *   class MyShader extends BaseShaderMaterial {
 *     private readonly uColor = uniform(color(0xff0000))  // field initializer
 *     constructor() {
 *       super()
 *       const mat = new NodeMaterial()
 *       mat.colorNode = this.uColor       // uColor đã sẵn sàng sau super()
 *       this.material = mat               // ← gán vào protected field
 *     }
 *     setColor(hex: number): void {
 *       if (this.isDisposed) return
 *       this.uColor.value.set(hex)
 *     }
 *   }
 *   mesh.material = new MyShader().getMaterial()
 *
 * DISPOSE: chỉ material.dispose() — texture do caller sở hữu, không dispose ở đây
 */

import { NodeMaterial } from 'three/webgpu'

export abstract class BaseShaderMaterial {
  /**
   * NodeMaterial instance — subclass gán trong constructor sau super() trả về.
   * Protected thay vì private để subclass viết: this.material = mat
   *
   * WHY không dùng abstract build() gọi trong base constructor:
   * JavaScript chạy parent constructor TRƯỚC subclass field initializers.
   * Nếu base constructor gọi build(), this.uTime = uniform(0) của subclass chưa tồn tại.
   * Pattern an toàn: subclass field initializers chạy sau super(), rồi mới gán material.
   */
  protected material: NodeMaterial | null = null

  /** Guard tránh double-dispose và mọi lời gọi sau dispose. Subclass đọc trực tiếp. */
  protected isDisposed = false

  /**
   * Lấy material để gán vào mesh.material.
   * Throw kèm tên class cụ thể nếu đã dispose — tránh silent null assignment vào mesh.
   */
  getMaterial(): NodeMaterial {
    if (!this.material) throw new Error(`${this.constructor.name}: already disposed`)
    return this.material
  }

  /**
   * Dispose material GPU resource. Safe to call nhiều lần.
   * Texture truyền qua constructor KHÔNG được dispose ở đây — caller chịu trách nhiệm.
   */
  dispose(): void {
    if (this.isDisposed) return
    this.material?.dispose()
    this.material = null
    this.isDisposed = true
  }
}
