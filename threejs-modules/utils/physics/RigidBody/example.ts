import * as THREE from 'three'
import { BaseWorld } from '../../core/BaseWorld'
import { PhysicsWorld } from '../PhysicsWorld'
import { RigidBody } from './index'

const BOX_COUNT = 12

class RigidBodyDemo extends BaseWorld {
  private physics = new PhysicsWorld()
  private bodies: RigidBody[] = []
  private readonly groundGeo = new THREE.BoxGeometry(20, 0.2, 20)
  private readonly groundMat = new THREE.MeshStandardMaterial({ color: 0x223344 })
  private readonly boxGeo = new THREE.BoxGeometry(1, 1, 1)
  private readonly boxMat = new THREE.MeshStandardMaterial({ color: 0x44aaff, roughness: 0.5, metalness: 0.2 })

  protected async onInit(): Promise<void> {
    this.scene.background = new THREE.Color(0x0a0a14)
    this.camera.position.set(0, 10, 16)
    this.camera.lookAt(0, 3, 0)

    const sun = new THREE.DirectionalLight(0xffffff, 2.5)
    sun.position.set(8, 12, 6)
    this.scene.add(sun, new THREE.AmbientLight(0x4466aa, 0.5))

    await this.physics.init()

    // Ground — fixed RigidBody
    const groundMesh = new THREE.Mesh(this.groundGeo, this.groundMat)
    this.scene.add(groundMesh)
    new RigidBody({
      physicsWorld: this.physics,
      mesh: groundMesh,
      type: 'fixed',
      shape: { type: 'cuboid', halfExtents: { x: 10, y: 0.1, z: 10 } },
    })

    // Dynamic boxes — stack + scatter
    for (let i = 0; i < BOX_COUNT; i++) {
      const col = i % 3
      const row = Math.floor(i / 3)
      const x = (col - 1) * 2 + (Math.random() - 0.5) * 0.3
      const y = 2 + row * 1.2
      const z = (Math.random() - 0.5) * 3

      const mesh = new THREE.Mesh(this.boxGeo, this.boxMat)
      mesh.position.set(x, y, z)
      this.scene.add(mesh)

      const body = new RigidBody({
        physicsWorld: this.physics,
        mesh,
        type: 'dynamic',
        shape: { type: 'cuboid', halfExtents: { x: 0.5, y: 0.5, z: 0.5 } },
        restitution: 0.4,
      })
      this.bodies.push(body)
    }
  }

  protected onUpdate(_time: number, dt: number): void {
    this.physics.step(dt)
    for (const body of this.bodies) body.sync()
  }

  protected onDispose(): void {
    for (const body of this.bodies) body.dispose()
    this.physics.dispose()
    this.groundGeo.dispose()
    this.groundMat.dispose()
    this.boxGeo.dispose()
    this.boxMat.dispose()
  }
}

export async function createDemo(canvas: HTMLCanvasElement): Promise<{ dispose(): void }> {
  const demo = new RigidBodyDemo(canvas)
  await demo.init()
  return { dispose: () => demo.dispose() }
}
