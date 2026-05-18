# RigidBody

Gắn Rapier physics body + collider vào Three.js `Object3D`. Sau mỗi `physicsWorld.step()`, gọi `sync()` để copy vị trí/rotation về mesh.

## Usage

```typescript
import { PhysicsWorld, RigidBody } from 'threejs-modules'

await physics.init()

// Ground (fixed)
const groundMesh = new THREE.Mesh(geo, mat)
new RigidBody({
  physicsWorld: physics,
  mesh: groundMesh,
  type: 'fixed',
  shape: { type: 'cuboid', halfExtents: { x: 10, y: 0.1, z: 10 } },
})

// Dynamic box
const box = new THREE.Mesh(boxGeo, boxMat)
box.position.set(0, 5, 0)
const body = new RigidBody({
  physicsWorld: physics,
  mesh: box,
  type: 'dynamic',
  shape: { type: 'ball', radius: 0.5 },
  restitution: 0.6,
})

// Mỗi frame
physics.step(dt)
body.sync()   // copy physics pos → mesh

// Cleanup
body.dispose()
```

## Props

| Prop | Type | Default | Mô tả |
|------|------|---------|-------|
| `physicsWorld` | `PhysicsWorld` | required | World đã init() |
| `mesh` | `THREE.Object3D` | required | Mesh sẽ được sync |
| `type` | `'dynamic' \| 'fixed' \| 'kinematic'` | `'dynamic'` | Loại rigid body |
| `shape` | `ColliderShape` | `cuboid {0.5,0.5,0.5}` | Hình dạng collider |
| `restitution` | `number` | `0.3` | Độ nảy (0–1) |
| `friction` | `number` | `0.7` | Ma sát (0–1) |

## ColliderShape

```typescript
// Hộp
{ type: 'cuboid'; halfExtents: { x: number; y: number; z: number } }
// Cầu
{ type: 'ball'; radius: number }
// Viên nang (dùng cho character)
{ type: 'capsule'; halfHeight: number; radius: number }
```

## Notes

- `type: 'kinematic'` → dùng với `CharacterController`
- `dispose()` xóa cả body lẫn collider khỏi RAPIER.World
- Ownership: caller sở hữu mesh, RigidBody không dispose mesh
