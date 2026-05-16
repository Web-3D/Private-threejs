# TrailSystem

Camera-facing ribbon trail theo sau moving objects. Dùng cho sword swing, vehicle trail, magic orb, projectile.

Mỗi frame push position mới vào ring buffer → rebuild ribbon geometry theo hướng camera. Fade từ head (sáng) → tail (tối = transparent với additive blending).

## Props

| Prop | Type | Default | Mô tả |
|---|---|---|---|
| `maxLength` | `number` | `40` | Số position giữ lại — ảnh hưởng chiều dài trail |
| `width` | `number` | `0.08` | Độ rộng ribbon (world units) |
| `headColor` | `ColorRepresentation` | `0xffffff` | Màu ở head (mới nhất) — tail fade về đen |

## Usage

```typescript
import { TrailSystem } from './TrailSystem'

const trail = new TrailSystem({ maxLength: 50, width: 0.12, headColor: 0xff8844 })
scene.add(trail.mesh)

// Animation loop — truyền vị trí object cần trail + camera để billboard đúng
trail.update(swordTip.position, camera)
```

## Tuning theo use case

| Use case | maxLength | width | headColor |
|---|---|---|---|
| Sword swing | 15 | 0.3 | 0xffffff (trắng sáng) |
| Vehicle trail | 80 | 0.05 | 0x8888ff (xanh dim) |
| Magic orb | 40 | 0.08 | 0x00ffcc |
| Projectile | 20 | 0.04 | 0xffaa00 |

## Runtime API

```typescript
trail.setWidth(0.2)              // thay đổi độ rộng runtime
trail.update(position, camera)   // bắt buộc mỗi frame
trail.dispose()                  // cleanup geometry + material
```

## Lưu ý kỹ thuật

- Additive blending — tail fade về đen = transparent tự nhiên, không cần alpha
- Billboard: mỗi frame tính hướng vuông góc với tangent + camera direction
- `Array.shift()` O(n) — maxLength < 100 là fine, không cần ring buffer
- Geometry pre-allocated theo maxLength — không allocate trong render loop
- Di chuyển ribbon: `trail.mesh.renderOrder = 1` nếu cần vẽ trên geometry khác

## So sánh với SparkSystem

| | TrailSystem | SparkSystem |
|---|---|---|
| Khi dùng | 1 object di chuyển, cần vệt đuôi | Nhiều particle từ emitter |
| Geometry | Ribbon (quad strip) — thay đổi mỗi frame | Points — baked trong vertex shader |
| CPU cost | Rebuild ribbon mỗi frame | Chỉ update 1 uniform (uTime) |
