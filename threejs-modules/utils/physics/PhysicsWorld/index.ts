/**
 * VỊ TRÍ  : threejs-modules/utils/physics/PhysicsWorld/index.ts
 * VAI TRÒ : Rapier.js world wrapper — async WASM init, gravity, simulation step
 * LIÊN HỆ : Dependency của RigidBody và CharacterController
 *
 * CÁCH DÙNG:
 *   const physics = new PhysicsWorld()
 *   await physics.init()                    // gọi trong onInit() của BaseWorld
 *   // mỗi frame:
 *   physics.step(dt)
 *   rigidBody.sync()                        // copy physics pos → mesh
 *   // cleanup:
 *   physics.dispose()
 * DISPOSE: free() WASM World để tránh memory leak
 */

import RAPIER from '@dimforge/rapier3d-compat'

export interface PhysicsWorldOptions {
  /** Gia tốc trọng lực. Default: { x:0, y:-9.81, z:0 } */
  gravity?: { x: number; y: number; z: number }
}

export class PhysicsWorld {
  private world: RAPIER.World | null = null
  private isDisposed = false

  /**
   * Async — phải await trước khi tạo RigidBody/CharacterController.
   * Gọi 1 lần duy nhất trong BaseWorld.onInit().
   */
  async init(opts?: PhysicsWorldOptions): Promise<void> {
    await RAPIER.init()
    const gravity = opts?.gravity ?? { x: 0, y: -9.81, z: 0 }
    this.world = new RAPIER.World(gravity)
  }

  /**
   * Advance simulation 1 step.
   * @param dt giây/frame — điều chỉnh timestep. Bỏ qua để dùng Rapier default (1/60s).
   */
  step(dt?: number): void {
    if (!this.world || this.isDisposed) return
    if (dt !== undefined) this.world.timestep = dt
    this.world.step()
  }

  /** Trả về RAPIER.World thô — dùng nội bộ bởi RigidBody, CharacterController */
  getWorld(): RAPIER.World {
    if (!this.world) throw new Error('PhysicsWorld: chưa gọi init()')
    return this.world
  }

  get isReady(): boolean {
    return this.world !== null && !this.isDisposed
  }

  dispose(): void {
    if (this.isDisposed) return
    this.world?.free()
    this.world = null
    this.isDisposed = true
  }
}

export type { RAPIER }
