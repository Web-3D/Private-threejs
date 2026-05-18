/**
 * VỊ TRÍ  : threejs-modules/utils/physics/CharacterController/index.ts
 * VAI TRÒ : Kinematic character movement — collision-resolved di chuyển + nhảy với gravity tích lũy
 * LIÊN HỆ : Yêu cầu PhysicsWorld + RigidBody(type:'kinematic', shape: capsule/cuboid)
 *
 * CÁCH DÙNG:
 *   const ctrl = new CharacterController({ physicsWorld, rigidBody, mesh })
 *   // mỗi frame (TRƯỚC physics.step()):
 *   ctrl.move({ x: vx, z: vz }, dt)
 *   if (wantJump) ctrl.jump()
 *   // SAU physics.step():
 *   rigidBody.sync()
 *   // cleanup:
 *   ctrl.dispose()
 * DISPOSE: removeCharacterController khỏi RAPIER.World
 */

import RAPIER from '@dimforge/rapier3d-compat'

interface PhysicsWorldRef {
  getWorld(): RAPIER.World
}

interface RigidBodyRef {
  getBody(): RAPIER.RigidBody
  getCollider(): RAPIER.Collider
}

export interface CharacterControllerOptions {
  physicsWorld: PhysicsWorldRef
  rigidBody: RigidBodyRef
  /** Speed m/s. Default: 5 */
  speed?: number
  /** Jump velocity m/s. Default: 8 */
  jumpSpeed?: number
  /** Gravity m/s². Default: 20 (mạnh hơn -9.81 cho feel game tốt hơn) */
  gravity?: number
  /** Snap-to-ground threshold. Default: 0.3 */
  snapDistance?: number
}

export class CharacterController {
  private controller: RAPIER.KinematicCharacterController
  private body: RAPIER.RigidBody
  private collider: RAPIER.Collider
  private world: RAPIER.World
  private readonly speed: number
  private readonly jumpSpeed: number
  private readonly gravity: number
  private verticalVelocity = 0
  private isDisposed = false

  constructor(opts: CharacterControllerOptions) {
    this.world = opts.physicsWorld.getWorld()
    this.body = opts.rigidBody.getBody()
    this.collider = opts.rigidBody.getCollider()
    this.speed = opts.speed ?? 5
    this.jumpSpeed = opts.jumpSpeed ?? 8
    this.gravity = opts.gravity ?? 20

    this.controller = this.world.createCharacterController(0.01)
    this.controller.enableSnapToGround(opts.snapDistance ?? 0.3)
    this.controller.setApplyImpulsesToDynamicBodies(true)
  }

  /**
   * Tính toán collision-resolved movement và đặt next kinematic translation.
   * Gọi TRƯỚC physicsWorld.step().
   * @param horizontal - hướng di chuyển ngang (x, z) theo không gian world, chưa nhân dt
   * @param dt - delta time giây
   */
  move(horizontal: { x: number; z: number }, dt: number): void {
    if (this.isDisposed) return

    const grounded = this.controller.computedGrounded()

    // Gravity tích lũy — reset khi chạm đất
    if (grounded) {
      this.verticalVelocity = Math.min(0, this.verticalVelocity)
    } else {
      this.verticalVelocity -= this.gravity * dt
    }

    const desired = {
      x: horizontal.x * this.speed * dt,
      y: this.verticalVelocity * dt,
      z: horizontal.z * this.speed * dt,
    }

    this.controller.computeColliderMovement(this.collider, desired)
    const corrected = this.controller.computedMovement()

    const pos = this.body.translation()
    this.body.setNextKinematicTranslation({
      x: pos.x + corrected.x,
      y: pos.y + corrected.y,
      z: pos.z + corrected.z,
    })
  }

  /** Nhảy — chỉ có hiệu lực khi đang đứng trên mặt đất */
  jump(): void {
    if (this.isDisposed) return
    if (this.controller.computedGrounded()) {
      this.verticalVelocity = this.jumpSpeed
    }
  }

  isOnGround(): boolean {
    return this.controller.computedGrounded()
  }

  dispose(): void {
    if (this.isDisposed) return
    this.world.removeCharacterController(this.controller)
    this.isDisposed = true
  }
}
