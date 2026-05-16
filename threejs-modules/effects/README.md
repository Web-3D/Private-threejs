# effects/

> GPU-driven visual effects — mọi thứ chạy hoàn toàn trên vertex/fragment shader, zero CPU per-particle.

---

## Modules

| Module              | Vai trò    | Dùng khi                                          | Complexity |
| ------------------- | ---------- | ------------------------------------------------- | ---------- |
| `GPUParticleSystem` | Base class | Cần custom physics: fire, smoke, magic, rain, ... | medium     |
| `SparkSystem`       | Preset     | Sparks/embers đơn giản, cắm vào chạy ngay         | medium     |
| `FireSystem`        | Preset     | Lửa campfire/torch — cắm vào chạy ngay, wind API  | medium     |
| `TrailSystem`       | Standalone | Ribbon trail theo sau moving object                | medium     |

---

## Design pattern

```
GPUParticleSystem   ← base class — hạ tầng GPU (geometry, material, uniforms, dispose)
    └── SparkSystem ← preset — wrap GPUParticleSystem với props + runtime API sẵn
```

`GPUParticleSystem` là lõi — bạn truyền vào 4 TSL builder functions để định nghĩa physics.  
`SparkSystem` là ví dụ preset tham khảo — dùng trực tiếp hoặc làm template cho preset mới.

---

## Khi nào dùng cái gì

| Tình huống                                      | Dùng             |
| ----------------------------------------------- | ---------------- |
| Sparks, embers, tia lửa — cần nhanh             | `SparkSystem`    |
| Fire, smoke, magic, rain, snow — cần tùy biến   | `GPUParticleSystem` |
| Preset mới với defaults riêng                   | Wrap `GPUParticleSystem` như `SparkSystem` |

---

## Quick start — Preset (SparkSystem)

```typescript
import { SparkSystem } from './SparkSystem'

const sparks = new SparkSystem({ count: 500, speed: 5.0, turbulence: true })
scene.add(sparks.points)

// animation loop:
sparks.update(clock.getElapsedTime())
```

## Quick start — Custom (GPUParticleSystem)

```typescript
import { GPUParticleSystem } from './GPUParticleSystem'
import { color, float, mix, vec3 } from 'three/tsl'

const fire = new GPUParticleSystem({
  count: 600,
  lifetime: 2.0,
  shape: 'disc',

  buildPosition: ({ aDir, tScaled, uTime }) => {
    const rise = vec3(0, float(0.8), 0).mul(tScaled)
    return rise.add(aDir.mul(float(0.3)).mul(tScaled))
  },
  buildColor: ({ t }) => mix(color(0xffcc44), color(0xff2200), t),
  buildSize:  ({ bell }) => mix(float(3.0), float(8.0), bell),
  buildOpacity: ({ bell }) => bell.mul(float(0.9)),
})

scene.add(fire.points)
fire.update(clock.getElapsedTime())
```

---

## Thêm preset mới

1. Tạo folder `effects/[EffectName]/`
2. Import `GPUParticleSystem` từ `'../GPUParticleSystem'`
3. Wrap constructor — expose props thay vì builder functions
4. Thêm `setX()` runtime methods cho các param hay dùng
5. Cập nhật bảng Modules ở trên + bảng catalog trong `../README.md`

---

## Notes kỹ thuật chung

- **1 draw call** cho toàn bộ particle system, bất kể count
- **Additive blending** mặc định — glow tự nhiên không cần post-processing
- `sizeAttenuation = false` — size tính bằng pixel, không scale theo khoảng cách
- Di chuyển emitter: set `system.points.position` — không dùng uniform riêng
- `dispose()` bắt buộc khi unmount scene
