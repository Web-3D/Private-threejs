/**
 * VỊ TRÍ  : threejs-modules/utils/physics/CollisionEventBus/index.ts
 * VAI TRÒ : Event bus kết nối Rapier collision detection với VAT/Particle/Audio handlers
 * LIÊN HỆ : Bọc PhysicsWorld.step() — gọi bus.step(dt) thay vì physics.step(dt) trong game loop
 *
 * CÁCH DÙNG:
 *   const bus = new CollisionEventBus({ physicsWorld: physics })
 *
 *   // Đăng ký handler cho body cần theo dõi
 *   bus.register({
 *     colliderHandle: wallBody.getCollider().handle,
 *     threshold: 50,   // lực tối thiểu (Rapier units ≈ Newton)
 *     onImpact: (e) => {
 *       vatShader.play('wall_break')
 *       setTimeout(() => particles.spawn(e.position), 300)
 *     }
 *   })
 *
 *   // Mỗi frame — thứ tự gọi:
 *   ctrl.move(horizontal, dt)   // 1. character movement (nếu có)
 *   bus.step(dt)                // 2. physics step + dispatch events (thay physics.step)
 *   charBody.sync()             // 3. sync mesh
 *
 *   // Cleanup
 *   bus.dispose()
 * DISPOSE: giải phóng RAPIER.EventQueue (WASM memory phải free() thủ công)
 */

import RAPIER from '@dimforge/rapier3d-compat'

// Structural interface — tránh import chéo giữa các module physics
interface PhysicsWorldRef {
  getWorld(): RAPIER.World
}

/** Dữ liệu va chạm được truyền vào onImpact callback */
export interface ImpactEvent {
  /** Vị trí xấp xỉ của va chạm — lấy từ translation của body (không phải contact point chính xác) */
  position: { x: number; y: number; z: number }
  /** Tổng lực va chạm theo Rapier units (xấp xỉ Newton trong không gian simulation) */
  force: number
  /** Handle của collider đối diện trong va chạm — dùng để nhận diện loại object va vào */
  otherHandle: number
}

/** Cấu hình handler cho 1 collider */
export interface CollisionHandler {
  /**
   * Handle của collider cần theo dõi.
   * Lấy từ: rigidBody.getCollider().handle
   */
  colliderHandle: number
  /**
   * Lực va chạm tối thiểu để kích hoạt onImpact (Rapier units).
   * Default: 0 — kích hoạt mọi lúc có contact force event.
   * Tăng lên để lọc va chạm nhẹ (chạm khẽ không trigger, đập mạnh mới trigger).
   */
  threshold?: number
  /** Callback thực thi khi lực vượt ngưỡng — dispatch VAT, Particle, Audio tại đây */
  onImpact: (event: ImpactEvent) => void
}

export interface CollisionEventBusOptions {
  physicsWorld: PhysicsWorldRef
}

export class CollisionEventBus {
  private world: RAPIER.World
  private eventQueue: RAPIER.EventQueue
  /** Map colliderHandle → danh sách handlers đã đăng ký cho collider đó */
  private handlers = new Map<number, CollisionHandler[]>()
  private isDisposed = false

  constructor(opts: CollisionEventBusOptions) {
    this.world = opts.physicsWorld.getWorld()
    // autoDrain=true (khuyến nghị chính thức): queue tự clear trước mỗi world.step(),
    // tránh RAM growth nếu có frame nào drain bị miss.
    this.eventQueue = new RAPIER.EventQueue(true)
  }

  /**
   * Đăng ký handler để nhận ImpactEvent khi collider va chạm đủ mạnh.
   * Tự động bật CONTACT_FORCE_EVENTS trên collider — không cần gọi tay.
   * Có thể đăng ký nhiều handler cho cùng 1 collider (chạy theo thứ tự đăng ký).
   */
  register(handler: CollisionHandler): void {
    if (this.isDisposed) return

    // Bật contact force events cho collider này để Rapier sinh event khi có va chạm
    const collider = this.world.getCollider(handler.colliderHandle)
    if (collider) {
      collider.setActiveEvents(RAPIER.ActiveEvents.CONTACT_FORCE_EVENTS)
      // Threshold = 0: Rapier luôn sinh event, ta tự filter trong handler.threshold
      collider.setContactForceEventThreshold(0)
    }

    const list = this.handlers.get(handler.colliderHandle) ?? []
    list.push(handler)
    this.handlers.set(handler.colliderHandle, list)
  }

  /**
   * Hủy đăng ký tất cả handlers cho 1 collider.
   * Gọi khi RigidBody đó bị dispose để tránh stale reference.
   */
  unregister(colliderHandle: number): void {
    this.handlers.delete(colliderHandle)
  }

  /**
   * Step physics simulation + drain và dispatch tất cả collision events.
   * **Thay thế physicsWorld.step(dt)** — không gọi cả 2 cùng lúc.
   *
   * Thứ tự trong game loop:
   *   ctrl.move()  →  bus.step(dt)  →  rigidBody.sync()
   */
  step(dt?: number): void {
    if (this.isDisposed) return

    if (dt !== undefined) this.world.timestep = dt
    // Truyền eventQueue vào step để Rapier ghi events vào đó
    this.world.step(this.eventQueue)

    // Drain tất cả contact force events phát sinh trong step vừa rồi
    this.eventQueue.drainContactForceEvents(event => {
      const h1 = event.collider1()
      const h2 = event.collider2()
      const force = event.totalForceMagnitude()

      // Kiểm tra cả 2 chiều: h1 xem có handler không, h2 xem có handler không
      this._dispatch(h1, h2, force)
      this._dispatch(h2, h1, force)
    })
  }

  /**
   * Tìm handlers cho watchedHandle và gọi onImpact nếu force >= threshold.
   * @param watchedHandle - collider đang được theo dõi
   * @param otherHandle   - collider đối diện (context cho handler)
   * @param force         - tổng lực va chạm
   */
  private _dispatch(watchedHandle: number, otherHandle: number, force: number): void {
    const handlers = this.handlers.get(watchedHandle)
    if (!handlers) return

    // Lấy vị trí xấp xỉ từ body translation — không phải contact point chính xác
    // nhưng đủ chính xác để spawn particle/VAT tại đó
    const collider = this.world.getCollider(watchedHandle)
    const body = collider?.parent()
    const pos = body?.translation() ?? { x: 0, y: 0, z: 0 }

    for (const handler of handlers) {
      const threshold = handler.threshold ?? 0
      if (force >= threshold) {
        handler.onImpact({ position: pos, force, otherHandle })
      }
    }
  }

  dispose(): void {
    if (this.isDisposed) return
    // EventQueue giữ WASM memory — phải free() thủ công, GC không lo được
    this.eventQueue.free()
    this.handlers.clear()
    this.isDisposed = true
  }
}
