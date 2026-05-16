# DissolveShader

Noise-based dissolve effect với edge glow — dùng cho spawn/despawn cinematic, death animation, teleport.

`uDissolveFactor` đi từ 0 (solid) → 1 (fully dissolved). Mỗi fragment bị clip nếu noise value < threshold. Vùng sát boundary phát edge color.

## Props

| Prop | Type | Default | Mô tả |
|---|---|---|---|
| `baseColor` | `ColorRepresentation` | `0xffffff` | Màu nền khi solid. Bỏ qua nếu có `map` |
| `map` | `THREE.Texture` | — | Texture thay thế `baseColor` |
| `edgeColor` | `ColorRepresentation` | `0x00ffff` | Màu glow tại boundary dissolve |
| `edgeWidth` | `number` | `0.08` | Độ rộng vùng edge [0-0.5] |
| `scale` | `number` | `2.0` | World-space noise scale — lớn hơn = hạt nhỏ hơn |

## Usage

```typescript
import { DissolveShader } from './DissolveShader'

const dissolve = new DissolveShader({
  baseColor: 0x4488ff,
  edgeColor: 0x00ffcc,
  scale: 1.8,
})

const mesh = new THREE.Mesh(geometry, dissolve.getMaterial())
scene.add(mesh)

// Animation loop:
dissolve.update(clock.getElapsedTime())
```

## Runtime API

```typescript
// Triggered animation — tự chạy, không cần set mỗi frame
dissolve.dissolveOut(2.5, clock.getElapsedTime())  // biến mất trong 2.5s
dissolve.dissolveIn(1.5, clock.getElapsedTime())   // xuất hiện lại trong 1.5s

// Manual control
dissolve.setDissolveFactor(0.5)  // 0 = solid, 1 = dissolved
dissolve.setEdgeWidth(0.12)
dissolve.setScale(3.0)

// Bắt buộc mỗi frame (drive uTime cho noise animation)
dissolve.update(time)
```

## Lưu ý kỹ thuật

- Dùng `positionWorld` → noise bám world space, không xoay theo mesh
- `step()` hard clip (không anti-alias) — rõ ràng hơn với fast dissolve
- Edge glow chỉ ở vùng visible (opacity = 1) nhưng sát boundary → không cần alpha blending phức tạp
- Texture ownership: `DissolveShader` không dispose `opts.map` — caller sở hữu
- `transparent: true` và `side: DoubleSide` — có thể overwrite sau khi gọi `getMaterial()`

## Kết hợp với SparkSystem

```typescript
// Sparks bay ra khi dissolve
const sparks = new SparkSystem({ count: 200, shape: 'sphere' })
sparks.points.position.copy(mesh.position)
scene.add(sparks.points)

dissolve.dissolveOut(2.0, t)
// Sparks chạy song song — visual illusion "vật thể vỡ thành particles"
```
