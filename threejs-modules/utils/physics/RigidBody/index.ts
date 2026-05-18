/**
 * VỊ TRÍ  : threejs-modules/utils/physics/RigidBody/index.ts
 * VAI TRÒ : Attach Rapier physics body + collider vào Three.js Object3D
 * LIÊN HỆ : Yêu cầu PhysicsWorld đã init(), sync() gọi sau mỗi physicsWorld.step()
 *
 * CÁCH DÙNG:
 *   const body = new RigidBody({ physicsWorld, mesh, type: 'dynamic', shape: { type: 'cuboid', halfExtents: {x:0.5,y:0.5,z:0.5} } })
 *   // mỗi frame sau physics.step():
 *   body.sync()
 *   // cleanup:
 *   body.dispose()
 * DISPOSE: removeCollider + removeRigidBody khỏi RAPIER.World
 */

import RAPIER from '@dimforge/rapier3d-compat'
import type * as THREE from 'three'

/** Structural interface — không cần import PhysicsWorld class */
interface PhysicsWorldRef {
  getWorld(): RAPIER.World
}

export type RigidBodyType = 'dynamic' | 'fixed' | 'kinematic'

export type ColliderShape =
  | { type: 'cuboid'; halfExtents: { x: number; y: number; z: number } }
  | { type: 'ball'; radius: number }
  | { type: 'capsule'; halfHeight: number; radius: number }

export interface RigidBodyOptions {
  physicsWorld: PhysicsWorldRef
  mesh: THREE.Object3D
  type?: RigidBodyType
  shape?: ColliderShape
  /** Restitution (độ nảy). Default: 0.3 */
  restitution?: number
  /** Friction. Default: 0.7 */
  friction?: number
}

export class RigidBody {
  private body: RAPIER.RigidBody
  private collider: RAPIER.Collider
  private world: RAPIER.World
  private mesh: THREE.Object3D
  private isDisposed = false

  constructor(opts: RigidBodyOptions) {
    this.world = opts.physicsWorld.getWorld()
    this.mesh = opts.mesh

    const pos = opts.mesh.position
    let bodyDesc: RAPIER.RigidBodyDesc
    switch (opts.type ?? 'dynamic') {
      case 'fixed':
        bodyDesc = RAPIER.RigidBodyDesc.fixed()
        break
      case 'kinematic':
        bodyDesc = RAPIER.RigidBodyDesc.kinematicPositionBased()
        break
      default:
        bodyDesc = RAPIER.RigidBodyDesc.dynamic()
    }
    bodyDesc.setTranslation(pos.x, pos.y, pos.z)

    this.body = this.world.createRigidBody(bodyDesc)
    this.collider = this.world.createCollider(
      this.buildColliderDesc(opts.shape, opts.restitution, opts.friction),
      this.body
    )
  }

  private buildColliderDesc(
    shape: ColliderShape | undefined,
    restitution = 0.3,
    friction = 0.7
  ): RAPIER.ColliderDesc {
    const s = shape ?? { type: 'cuboid', halfExtents: { x: 0.5, y: 0.5, z: 0.5 } }
    let desc: RAPIER.ColliderDesc
    if (s.type === 'ball') {
      desc = RAPIER.ColliderDesc.ball(s.radius)
    } else if (s.type === 'capsule') {
      desc = RAPIER.ColliderDesc.capsule(s.halfHeight, s.radius)
    } else {
      const he = s.halfExtents
      desc = RAPIER.ColliderDesc.cuboid(he.x, he.y, he.z)
    }
    return desc.setRestitution(restitution).setFriction(friction)
  }

  /** Copy vị trí + rotation từ physics body → Three.js mesh. Gọi sau mỗi physicsWorld.step(). */
  sync(): void {
    if (this.isDisposed) return
    const t = this.body.translation()
    const r = this.body.rotation()
    this.mesh.position.set(t.x, t.y, t.z)
    this.mesh.quaternion.set(r.x, r.y, r.z, r.w)
  }

  getBody(): RAPIER.RigidBody {
    return this.body
  }

  getCollider(): RAPIER.Collider {
    return this.collider
  }

  dispose(): void {
    if (this.isDisposed) return
    this.world.removeCollider(this.collider, false)
    this.world.removeRigidBody(this.body)
    this.isDisposed = true
  }
}
