import * as THREE from 'three'
import RAPIER from '@dimforge/rapier3d-compat'
import { BaseWorld } from '../../core/BaseWorld'
import { PhysicsWorld } from './index'

class PhysicsWorldDemo extends BaseWorld {
  private physics = new PhysicsWorld()
  private boxes: Array<{ mesh: THREE.Mesh; body: RAPIER.RigidBody }> = []
  private readonly groundGeo = new THREE.BoxGeometry(20, 0.2, 20)
  private readonly groundMat = new THREE.MeshStandardMaterial({ color: 0x334455 })
  private readonly boxGeo = new THREE.BoxGeometry(1, 1, 1)
  private readonly boxMat = new THREE.MeshStandardMaterial({ color: 0xff6600, roughness: 0.6 })

  protected async onInit(): Promise<void> {
    this.scene.background = new THREE.Color(0x111111)
    this.camera.position.set(0, 8, 14)
    this.camera.lookAt(0, 2, 0)

    const light = new THREE.DirectionalLight(0xffffff, 2)
    light.position.set(5, 10, 5)
    this.scene.add(light, new THREE.AmbientLight(0xffffff, 0.4))

    await this.physics.init()
    const world = this.physics.getWorld()

    // Ground — fixed body với cuboid collider
    const groundBody = world.createRigidBody(RAPIER.RigidBodyDesc.fixed())
    world.createCollider(RAPIER.ColliderDesc.cuboid(10, 0.1, 10), groundBody)
    const groundMesh = new THREE.Mesh(this.groundGeo, this.groundMat)
    this.scene.add(groundMesh)

    // 8 boxes rơi từ các độ cao khác nhau
    for (let i = 0; i < 8; i++) {
      const x = (Math.random() - 0.5) * 6
      const y = 4 + i * 1.5
      const z = (Math.random() - 0.5) * 6

      const bodyDesc = RAPIER.RigidBodyDesc.dynamic().setTranslation(x, y, z)
      const body = world.createRigidBody(bodyDesc)
      world.createCollider(RAPIER.ColliderDesc.cuboid(0.5, 0.5, 0.5), body)

      const mesh = new THREE.Mesh(this.boxGeo, this.boxMat)
      this.scene.add(mesh)
      this.boxes.push({ mesh, body })
    }
  }

  protected onUpdate(_time: number, dt: number): void {
    this.physics.step(dt)
    for (const { mesh, body } of this.boxes) {
      const t = body.translation()
      const r = body.rotation()
      mesh.position.set(t.x, t.y, t.z)
      mesh.quaternion.set(r.x, r.y, r.z, r.w)
    }
  }

  protected onDispose(): void {
    this.physics.dispose()
    this.groundGeo.dispose()
    this.groundMat.dispose()
    this.boxGeo.dispose()
    this.boxMat.dispose()
  }
}

export async function createDemo(canvas: HTMLCanvasElement): Promise<{ dispose(): void }> {
  const demo = new PhysicsWorldDemo(canvas)
  await demo.init()
  return { dispose: () => demo.dispose() }
}
