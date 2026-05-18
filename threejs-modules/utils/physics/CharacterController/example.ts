import * as THREE from 'three'
import { BaseWorld } from '../../core/BaseWorld'
import { PhysicsWorld } from '../PhysicsWorld'
import { RigidBody } from '../RigidBody'
import { CharacterController } from './index'

// WASD + Space — input state
const keys = new Set<string>()

class CharacterControllerDemo extends BaseWorld {
  private physics = new PhysicsWorld()
  private charBody: RigidBody | null = null
  private ctrl: CharacterController | null = null
  private readonly groundGeo = new THREE.BoxGeometry(20, 0.4, 20)
  private readonly groundMat = new THREE.MeshStandardMaterial({ color: 0x334455 })
  private readonly charGeo = new THREE.CapsuleGeometry(0.4, 1.2, 4, 8)
  private readonly charMat = new THREE.MeshStandardMaterial({ color: 0x00cc88 })
  // Platform
  private readonly platGeo = new THREE.BoxGeometry(4, 0.4, 4)
  private readonly platMat = new THREE.MeshStandardMaterial({ color: 0x886644 })

  protected async onInit(): Promise<void> {
    this.scene.background = new THREE.Color(0x0d1117)
    this.camera.position.set(0, 6, 12)
    this.camera.lookAt(0, 1, 0)

    const sun = new THREE.DirectionalLight(0xffffff, 2)
    sun.position.set(6, 10, 6)
    this.scene.add(sun, new THREE.AmbientLight(0x4488aa, 0.5))

    await this.physics.init()

    // Ground
    const groundMesh = new THREE.Mesh(this.groundGeo, this.groundMat)
    this.scene.add(groundMesh)
    new RigidBody({
      physicsWorld: this.physics,
      mesh: groundMesh,
      type: 'fixed',
      shape: { type: 'cuboid', halfExtents: { x: 10, y: 0.2, z: 10 } },
    })

    // Raised platform
    const platform = new THREE.Mesh(this.platGeo, this.platMat)
    platform.position.set(4, 1.2, 0)
    this.scene.add(platform)
    new RigidBody({
      physicsWorld: this.physics,
      mesh: platform,
      type: 'fixed',
      shape: { type: 'cuboid', halfExtents: { x: 2, y: 0.2, z: 2 } },
    })

    // Character — kinematic capsule
    const charMesh = new THREE.Mesh(this.charGeo, this.charMat)
    charMesh.position.set(0, 1.5, 0)
    this.scene.add(charMesh)

    this.charBody = new RigidBody({
      physicsWorld: this.physics,
      mesh: charMesh,
      type: 'kinematic',
      shape: { type: 'capsule', halfHeight: 0.6, radius: 0.4 },
    })

    this.ctrl = new CharacterController({
      physicsWorld: this.physics,
      rigidBody: this.charBody,
      speed: 5,
      jumpSpeed: 9,
    })

    document.addEventListener('keydown', e => keys.add(e.code))
    document.addEventListener('keyup', e => keys.delete(e.code))
  }

  protected onUpdate(_time: number, dt: number): void {
    if (!this.ctrl || !this.charBody) return

    const horizontal = { x: 0, z: 0 }
    if (keys.has('KeyA') || keys.has('ArrowLeft'))  horizontal.x -= 1
    if (keys.has('KeyD') || keys.has('ArrowRight')) horizontal.x += 1
    if (keys.has('KeyW') || keys.has('ArrowUp'))    horizontal.z -= 1
    if (keys.has('KeyS') || keys.has('ArrowDown'))  horizontal.z += 1

    if (keys.has('Space')) this.ctrl.jump()

    this.ctrl.move(horizontal, dt)
    this.physics.step(dt)
    this.charBody.sync()

    // Camera theo character
    const pos = this.charBody.getBody().translation()
    this.camera.position.set(pos.x, pos.y + 5, pos.z + 10)
    this.camera.lookAt(pos.x, pos.y + 1, pos.z)
  }

  protected onDispose(): void {
    this.ctrl?.dispose()
    this.charBody?.dispose()
    this.physics.dispose()
    this.groundGeo.dispose()
    this.groundMat.dispose()
    this.charGeo.dispose()
    this.charMat.dispose()
    this.platGeo.dispose()
    this.platMat.dispose()
  }
}

export async function createDemo(canvas: HTMLCanvasElement): Promise<{ dispose(): void }> {
  const demo = new CharacterControllerDemo(canvas)
  await demo.init()
  return { dispose: () => demo.dispose() }
}
