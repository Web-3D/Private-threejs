/**
 * Demo: CollisionEventBus
 *
 * Cảnh: 3 box rơi từ các độ cao khác nhau → đập xuống sàn.
 * CollisionEventBus đăng ký handler cho từng box:
 *   - Lực nhỏ (< 80)  → box flash vàng (va nhẹ)
 *   - Lực lớn (≥ 80)  → box flash trắng (va mạnh) + log force vào console
 *
 * Trong project thực: thay flash bằng vatShader.play() + particles.spawn().
 *
 * Thứ tự game loop (quan trọng):
 *   bus.step(dt)        ← thay physics.step(dt)
 *   rigidBody.sync()    ← sau step
 */

import * as THREE from 'three'
import { BaseWorld } from '../../core/BaseWorld'
import { PhysicsWorld } from '../PhysicsWorld'
import { RigidBody } from '../RigidBody'
import { CollisionEventBus } from './index'

// Dữ liệu mỗi box: body, mesh, material gốc, màu gốc
interface BoxData {
  body: RigidBody
  mesh: THREE.Mesh
  mat: THREE.MeshStandardMaterial
  geo: THREE.BoxGeometry
  baseColor: number
  flashTimer: number   // countdown ms còn lại của flash — 0 = về màu gốc
  flashColor: number   // màu khi đang flash
}

class CollisionEventBusDemo extends BaseWorld {
  private physics = new PhysicsWorld()
  private bus: CollisionEventBus | null = null
  private boxes: BoxData[] = []

  // Geometry/material dùng chung cho ground
  private readonly groundGeo = new THREE.BoxGeometry(20, 0.4, 20)
  private readonly groundMat = new THREE.MeshStandardMaterial({ color: 0x334455 })

  protected async onInit(): Promise<void> {
    this.scene.background = new THREE.Color(0x0d1117)
    this.camera.position.set(0, 10, 18)
    this.camera.lookAt(0, 3, 0)

    const sun = new THREE.DirectionalLight(0xffffff, 2)
    sun.position.set(6, 12, 8)
    this.scene.add(sun, new THREE.AmbientLight(0x4488aa, 0.4))

    await this.physics.init()

    // Bus thay thế physics.step() — đăng ký sau khi init()
    this.bus = new CollisionEventBus({ physicsWorld: this.physics })

    // Ground — fixed body, không cần handler (va chạm detect từ phía box)
    const groundMesh = new THREE.Mesh(this.groundGeo, this.groundMat)
    this.scene.add(groundMesh)
    new RigidBody({
      physicsWorld: this.physics,
      mesh: groundMesh,
      type: 'fixed',
      shape: { type: 'cuboid', halfExtents: { x: 10, y: 0.2, z: 10 } },
    })

    // 3 box rơi từ độ cao khác nhau → lực va chạm khác nhau
    const configs = [
      { x: -4, height: 4,  color: 0x44aaff, label: 'nhẹ'  },  // ~lực nhỏ
      { x:  0, height: 9,  color: 0x44ff88, label: 'vừa'  },  // ~lực trung bình
      { x:  4, height: 16, color: 0xff6644, label: 'mạnh' },  // ~lực lớn
    ]

    for (const cfg of configs) {
      const geo = new THREE.BoxGeometry(1.2, 1.2, 1.2)
      const mat = new THREE.MeshStandardMaterial({ color: cfg.color })
      const mesh = new THREE.Mesh(geo, mat)
      mesh.position.set(cfg.x, cfg.height, 0)
      this.scene.add(mesh)

      const body = new RigidBody({
        physicsWorld: this.physics,
        mesh,
        type: 'dynamic',
        shape: { type: 'cuboid', halfExtents: { x: 0.6, y: 0.6, z: 0.6 } },
      })

      const boxData: BoxData = {
        body, mesh, mat, geo,
        baseColor: cfg.color,
        flashTimer: 0,
        flashColor: 0xffffff,
      }
      this.boxes.push(boxData)

      // Đăng ký handler — threshold thấp để bắt được cả va chạm nhẹ
      this.bus!.register({
        colliderHandle: body.getCollider().handle,
        threshold: 5,   // bắt mọi va chạm có lực > 5
        onImpact: (e) => {
          if (e.force >= 80) {
            // Va mạnh → flash trắng, log chi tiết
            boxData.flashColor = 0xffffff
            boxData.flashTimer = 400
            console.log(`[CollisionEventBus] ${cfg.label} — force: ${e.force.toFixed(1)} (pos: ${e.position.x.toFixed(1)}, ${e.position.y.toFixed(1)}, ${e.position.z.toFixed(1)})`)
          } else {
            // Va nhẹ/vừa → flash vàng
            boxData.flashColor = 0xffcc00
            boxData.flashTimer = 200
          }
          mat.color.setHex(boxData.flashColor)
        },
      })
    }
  }

  protected onUpdate(_time: number, dt: number): void {
    // bus.step() thay physics.step() — bên trong gọi world.step(eventQueue) + drain events
    this.bus?.step(dt)

    // Sync tất cả box: copy Rapier position/rotation → Three.js mesh
    for (const box of this.boxes) {
      box.body.sync()

      // Đếm ngược flash timer → về màu gốc khi hết
      if (box.flashTimer > 0) {
        box.flashTimer -= dt * 1000   // dt tính giây, timer tính ms
        if (box.flashTimer <= 0) {
          box.flashTimer = 0
          box.mat.color.setHex(box.baseColor)
        }
      }
    }
  }

  protected onDispose(): void {
    this.bus?.dispose()
    for (const box of this.boxes) {
      box.body.dispose()
      box.geo.dispose()
      box.mat.dispose()
    }
    this.physics.dispose()
    this.groundGeo.dispose()
    this.groundMat.dispose()
  }
}

export async function createDemo(canvas: HTMLCanvasElement): Promise<{ dispose(): void }> {
  const demo = new CollisionEventBusDemo(canvas)
  await demo.init()
  return { dispose: () => demo.dispose() }
}
