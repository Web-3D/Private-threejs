# CharacterController

Kinematic character movement dùng Rapier's `KinematicCharacterController`. Xử lý collision resolution, gravity tích lũy, và nhảy. Cần `RigidBody` với `type: 'kinematic'`.

## Usage

```typescript
import { PhysicsWorld, RigidBody, CharacterController } from 'threejs-modules'

await physics.init()

// 1. Tạo kinematic rigid body cho character
const charMesh = new THREE.Mesh(capsuleGeo, mat)
charMesh.position.set(0, 2, 0)
const charBody = new RigidBody({
  physicsWorld: physics,
  mesh: charMesh,
  type: 'kinematic',
  shape: { type: 'capsule', halfHeight: 0.6, radius: 0.4 },
})

// 2. CharacterController
const ctrl = new CharacterController({
  physicsWorld: physics,
  rigidBody: charBody,
  speed: 5,
  jumpSpeed: 9,
})

// Mỗi frame (thứ tự quan trọng)
ctrl.move({ x: inputX, z: inputZ }, dt)   // 1. tính movement
if (wantJump) ctrl.jump()                  // 2. jump (nếu grounded)
physics.step(dt)                           // 3. step simulation
charBody.sync()                            // 4. sync mesh

// Cleanup
ctrl.dispose()
charBody.dispose()
```

## Props

| Prop | Type | Default | Mô tả |
|------|------|---------|-------|
| `physicsWorld` | `PhysicsWorld` | required | World đã init() |
| `rigidBody` | `RigidBody` | required | Phải type='kinematic' |
| `speed` | `number` | `5` | Di chuyển m/s |
| `jumpSpeed` | `number` | `8` | Tốc độ nhảy ban đầu m/s |
| `gravity` | `number` | `20` | Gravity m/s² (dương = hướng xuống) |
| `snapDistance` | `number` | `0.3` | Ngưỡng snap-to-ground |

## Notes

- **Thứ tự gọi quan trọng:** `ctrl.move()` → `ctrl.jump()` → `physics.step()` → `charBody.sync()`
- `gravity` default 20 (mạnh hơn 9.81) cho feel game tốt hơn — điều chỉnh theo nhu cầu
- `jump()` chỉ có hiệu lực khi `isOnGround() === true`
- `setApplyImpulsesToDynamicBodies(true)` — character đẩy được các dynamic body khác
