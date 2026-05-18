# PhysicsWorld

Rapier.js world wrapper. Async WASM init, configurable gravity, fixed-step simulation.

## Usage

```typescript
import { PhysicsWorld } from 'threejs-modules'
import RAPIER from '@dimforge/rapier3d-compat'

// Trong BaseWorld.onInit() — bắt buộc await
const physics = new PhysicsWorld()
await physics.init({ gravity: { x: 0, y: -9.81, z: 0 } })

// Tạo collider thủ công (khi không dùng RigidBody wrapper)
const world = physics.getWorld()
const groundBody = world.createRigidBody(RAPIER.RigidBodyDesc.fixed())
world.createCollider(RAPIER.ColliderDesc.cuboid(10, 0.1, 10), groundBody)

// Mỗi frame
physics.step(dt)   // dt = giây/frame

// Cleanup
physics.dispose()
```

## Props

| Prop | Type | Default | Mô tả |
|------|------|---------|-------|
| `gravity` | `{x,y,z}` | `{x:0, y:-9.81, z:0}` | Gia tốc trọng lực (m/s²) |

## Notes

- `init()` phải await trước mọi thao tác physics — WASM load mất ~5–50ms
- `step(dt)` điều chỉnh `world.timestep` mỗi frame — tắt đi để dùng Rapier fixed 1/60s
- `dispose()` gọi `world.free()` để release WASM memory — không gọi = leak
- Không giữ reference tới `RAPIER.World` sau khi `dispose()` — body/collider sẽ bị free

## Performance

| Metric | Điển hình |
|--------|-----------|
| CPU/frame (50 bodies) | ~0.3–1ms |
| WASM memory | ~2MB base |
| Init time | 5–50ms (tùy device) |
