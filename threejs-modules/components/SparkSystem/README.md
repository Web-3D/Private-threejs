# SparkSystem

Preset particle system cho sparks/embers — xây trên [`GPUParticleSystem`](../GPUParticleSystem/README.md). Toàn bộ animation chạy trong vertex shader. CPU chỉ cập nhật 1 uniform (`uTime`) mỗi frame, không loop qua từng particle.

> Cần hiệu ứng khác (fire, rain, magic)? Dùng `GPUParticleSystem` trực tiếp với custom builder functions.

## Props

| Prop | Type | Default | Mô tả |
|---|---|---|---|
| `count` | `number` | `300` | Số particle |
| `lifetime` | `number` | `1.5` | Giây mỗi vòng lặp particle |
| `speed` | `number` | `4.0` | Tốc độ bắn ban đầu (world units/s) |
| `gravity` | `number` | `4.0` | Lực kéo xuống (world units/s²) |
| `spread` | `number` | `Math.PI/4` | Góc mở của emitter (radian) |
| `sizeMin` | `number` | `2` | Pixel size nhỏ nhất (lúc sinh/chết) |
| `sizeMax` | `number` | `6` | Pixel size lớn nhất (giữa vòng đời) |
| `colorHot` | `ColorRepresentation` | `0xffee88` | Màu lúc mới sinh (vàng trắng) |
| `colorCold` | `ColorRepresentation` | `0xcc2200` | Màu lúc chết (đỏ tối) |
| `turbulence` | `boolean` | `false` | Jitter ngẫu nhiên via `triNoise3D` |
| `shape` | `'cone' \| 'sphere' \| 'disc'` | `'cone'` | Hướng bắn particle |

## Emitter shapes

| Shape | Kết quả |
|---|---|
| `cone` | Sparks bắn lên trong hình nón — lửa trại, đuốc, engine |
| `sphere` | Tỏa tất cả hướng — explosion, impact |
| `disc` | Bắn ngang với tilt nhẹ — grinding metal, brake sparks |

## Usage

```typescript
import * as THREE from 'three'
import { SparkSystem } from './SparkSystem'

const sparks = new SparkSystem({
  count: 500,
  speed: 5.0,
  turbulence: true,
  shape: 'cone',
  colorHot: 0xffffff,
  colorCold: 0xff4400,
})

scene.add(sparks.points)

// Đặt vị trí emitter — move mesh, không cần uniform
sparks.points.position.set(0, 1.5, 0)

// Mỗi frame:
sparks.update(clock.getElapsedTime())
```

## Runtime API

```typescript
sparks.setSpeed(6.0)     // tăng tốc độ bắn
sparks.setGravity(9.8)   // trọng lực mạnh hơn
sparks.setLifetime(2.0)  // vòng đời dài hơn
sparks.update(time)      // bắt buộc mỗi frame
```

## Lưu ý kỹ thuật

- **100% GPU-driven** — mỗi particle là 1 vertex, shader tính position từ `aDir + aOffset + uTime`
- **Additive blending** — sparks sáng chồng lên nhau → hiệu ứng glow tự nhiên, không cần post-processing
- `depthWrite = false` — tránh z-fighting với geometry phía sau
- `sizeAttenuation = false` — size tính bằng pixel, không bị thu nhỏ theo khoảng cách
- Emitter position: di chuyển `sparks.points` trong scene — không cần uniform riêng
- `turbulence: true` dùng `triNoise3D` — thêm ~10 texture sample ops/fragment, cân nhắc cho mobile

## Performance

| Trường hợp | Draw calls | GPU cost |
|---|---|---|
| 300 particles, no turbulence | 1 | thấp |
| 1000 particles, no turbulence | 1 | trung bình |
| 300 particles + turbulence | 1 | trung bình (triNoise3D) |

Particle count không ảnh hưởng draw calls — chỉ ảnh hưởng vertex processing.
