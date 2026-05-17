# ShockwaveRing

Ring mở rộng + fade khi impact hoặc explosion. Lifecycle: `play()` → `update()` → `isComplete`. Extends `BaseGPUEffect`.

## Cách dùng

```typescript
import { ShockwaveRing } from 'threejs-modules/effects/ShockwaveRing'

const ring = new ShockwaveRing({ color: 0xff8800, maxScale: 4, lifetime: 0.8 })
scene.add(ring.root)

// Khi impact xảy ra:
ring.play(clock.getElapsedTime())

// Mỗi frame:
ring.update(clock.getElapsedTime())
if (ring.isComplete) ring.dispose()  // hoặc play() lại để reuse
```

## Reuse pattern (pool-friendly)

```typescript
// Không dispose — reset và dùng lại
if (ring.isComplete) {
  ring.root.position.set(newX, 0, newZ)
  ring.play(clock.getElapsedTime())
}
```

## API

| Prop / Method | Mô tả |
|---|---|
| `root` | `THREE.Mesh` — nằm ngang trên XZ plane |
| `isComplete` | `true` khi animation kết thúc |
| `play(time)` | Kích hoạt animation tại `time` |
| `update(time)` | Cập nhật scale + opacity mỗi frame |
| `setVisible(bool)` | Toggle (từ BaseGPUEffect) |
| `dispose()` | Dispose geo + mat |

## Options

| Option | Type | Default | Mô tả |
|---|---|---|---|
| `radius` | `number` | `0.5` | Outer radius (world units) |
| `thickness` | `number` | `0.04` | Ring thickness |
| `maxScale` | `number` | `3.0` | Scale multiplier tại cuối |
| `lifetime` | `number` | `0.8` | Duration (seconds) |
| `color` | `ColorRepresentation` | `0xffffff` | Ring color |

## Animation curve

```
scale:   0 ─────────── maxScale   (linear)
opacity: 1 ─────────── 0          (ease-out: 1 - t²)
```

Ring bắt đầu nhỏ, mở rộng nhanh rồi chậm dần (opacity drop nhanh hơn cuối) — tạo cảm giác shockwave "bùng" mạnh rồi tan ra.
