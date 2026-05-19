# CollisionEventBus

Kết nối Rapier physics collision detection với VAT/Particle/Audio handlers theo force threshold và timing. Thay thế `physics.step(dt)` trong game loop — bên trong vẫn gọi `world.step()` nhưng tự drain và dispatch events.

## Usage

```typescript
import { PhysicsWorld, RigidBody, CollisionEventBus } from 'threejs-modules'

await physics.init()
const bus = new CollisionEventBus({ physicsWorld: physics })

// Tạo body cần theo dõi
const wallBody = new RigidBody({ physicsWorld: physics, mesh: wallMesh, type: 'fixed', ... })

// Đăng ký handler
bus.register({
  colliderHandle: wallBody.getCollider().handle,   // handle của collider cần watch
  threshold: 50,                                    // lực tối thiểu để trigger
  onImpact: (e) => {
    // e.position  — vị trí xấp xỉ (body translation)
    // e.force     — tổng lực va chạm (Rapier units ≈ Newton)
    // e.otherHandle — handle của collider đối diện
    vatShader.play('wall_break')
    setTimeout(() => particles.spawn(e.position), 300)
    audio.play('crash', e.position)
  }
})

// Mỗi frame — bus.step() thay physics.step()
ctrl.move(horizontal, dt)    // 1. character (nếu có)
bus.step(dt)                 // 2. physics step + dispatch (KHÔNG gọi physics.step nữa)
wallBody.sync()              // 3. sync mesh

// Cleanup
bus.unregister(wallBody.getCollider().handle)   // trước khi dispose body
bus.dispose()
wallBody.dispose()
```

## Props

| Prop | Type | Default | Mô tả |
|------|------|---------|-------|
| `physicsWorld` | `PhysicsWorldRef` | required | PhysicsWorld đã `init()` |

## CollisionHandler

| Field | Type | Default | Mô tả |
|-------|------|---------|-------|
| `colliderHandle` | `number` | required | `rigidBody.getCollider().handle` |
| `threshold` | `number` | `0` | Lực tối thiểu để trigger onImpact |
| `onImpact` | `(e: ImpactEvent) => void` | required | Callback khi va chạm vượt ngưỡng |

## ImpactEvent

| Field | Type | Mô tả |
|-------|------|-------|
| `position` | `{x,y,z}` | Vị trí xấp xỉ (body.translation(), không phải contact point chính xác) |
| `force` | `number` | Tổng lực va chạm (Rapier units) |
| `otherHandle` | `number` | Handle của collider đối diện — nhận diện loại vật thể |

## Notes

- **Thay physics.step():** Gọi `bus.step(dt)` thay vì `physics.step(dt)` — không gọi cả 2
- **Thứ tự gọi:** `ctrl.move()` → `bus.step(dt)` → `rigidBody.sync()`
- **Bật tự động:** `register()` tự gọi `setActiveEvents(CONTACT_FORCE_EVENTS)` trên collider
- **Nhiều handler/collider:** Có thể `register()` nhiều lần cho cùng 1 colliderHandle
- **Unregister trước dispose:** Gọi `unregister(handle)` trước khi dispose RigidBody để tránh stale reference
- **WASM memory:** `dispose()` phải được gọi để `eventQueue.free()` — GC không tự giải phóng WASM

## Typical choreography

```typescript
onImpact: (e) => {
  shockwaveRing.trigger(e.position)           // t=0ms — impact ngay lập tức
  vatShader.play('wall_break', e.position)    // t=0ms — mesh bắt đầu vỡ

  setTimeout(() => {
    particles.spawn(e.position)               // t=300ms — bụi theo sau mảnh vỡ
    sparks.trigger(e.position)                // t=500ms — tia lửa
  }, 300)
}
```
