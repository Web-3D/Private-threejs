# BeamEffect

Line từ điểm A đến B — laser, lightning, connection, rope. Tự tính hướng và độ dài từ 2 Vector3. Extends `BaseGPUEffect`.

## Cách dùng

```typescript
import { BeamEffect } from 'threejs-modules/effects/BeamEffect'

const beam = new BeamEffect({ color: 0x00ffff, radius: 0.02, additive: true })
scene.add(beam.root)

// Mỗi frame — truyền 2 điểm đầu/cuối:
beam.update(startVec3, endVec3)

// Tự ẩn khi start === end (khoảng cách < 0.0001)

// Xong hẳn:
beam.dispose()
```

## API

| Prop / Method | Mô tả |
|---|---|
| `root` | `THREE.Mesh` (cylinder) — add vào scene |
| `update(start, end)` | Reposition + reorient beam mỗi frame |
| `setColor(color)` | Thay color runtime |
| `setVisible(bool)` | Toggle (từ BaseGPUEffect) |
| `dispose()` | Dispose geo + mat |

## Options

| Option | Type | Default | Mô tả |
|---|---|---|---|
| `radius` | `number` | `0.02` | Cylinder radius (world units) |
| `color` | `ColorRepresentation` | `0x00ffff` | Beam color |
| `opacity` | `number` | `1.0` | Opacity 0–1 |
| `additive` | `boolean` | `false` | Additive blending cho glow |

## Performance notes

`update()` không tạo Vector3 mới mỗi frame — dùng 3 reusable temp fields (`_dir`, `_mid`, `_q`). Safe để gọi mỗi frame với nhiều beam cùng lúc.

```typescript
// 10 beams — không có GC pressure từ Vector3 alloc
for (const beam of beams) {
  beam.update(start, end)
}
```

## Geometry

Dùng `CylinderGeometry(r, r, 1)` với `height = 1` — `root.scale.y` được set bằng khoảng cách A–B mỗi frame. Cylinder mặc định hướng theo trục Y, `setFromUnitVectors(UP, dir)` xoay về hướng beam.
