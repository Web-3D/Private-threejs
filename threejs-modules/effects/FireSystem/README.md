# FireSystem

GPU-driven fire effect — inner flame (hot, narrow) + outer flame (turbulent, wide). Xây trên `GPUParticleSystem`. 2 draw calls, zero CPU per-particle.

## Props

| Prop | Type | Default | Mô tả |
|---|---|---|---|
| `count` | `number` | `400` | Tổng particle, split 40% inner / 60% outer |
| `windX` | `number` | `0` | Gió dọc trục X (world units/s) |
| `windZ` | `number` | `0` | Gió dọc trục Z (world units/s) |

## Usage

```typescript
import { FireSystem } from './FireSystem'

const fire = new FireSystem({ count: 400 })
scene.add(fire.group)

// Đặt vị trí: di chuyển group
fire.group.position.set(2, 0, 0)

// Animation loop:
fire.update(clock.getElapsedTime())
```

## Runtime API

```typescript
fire.setWind(0.3, 0.1)   // gió hướng x=0.3, z=0.1 world units/s
fire.update(time)         // bắt buộc mỗi frame
fire.dispose()            // cleanup cả 2 layer
```

## Mở rộng

Thêm smoke layer:

```typescript
import { GPUParticleSystem } from '../GPUParticleSystem'

const smoke = new GPUParticleSystem({
  count: 80,
  lifetime: 3.5,
  shape: 'disc',
  buildPosition: ({ aDir, tScaled, uTime }) => {
    const rise = vec3(0, 1, 0).mul(float(0.6)).mul(tScaled)
    const drift = aDir.mul(float(0.5)).mul(tScaled)
    return rise.add(drift)
  },
  buildColor: ({ t }) => mix(color(0x555555), color(0x111111), t),
  buildSize: ({ bell }) => bell.mul(float(40)).add(float(10)),
  buildOpacity: ({ t }) => float(1).sub(t).mul(float(0.15)),
})
fire.group.add(smoke.points)
```

## Performance

| Layer | Draw calls | Particle count | Ghi chú |
|---|---|---|---|
| Inner flame | 1 | 40% of count | Lifetime 0.7s — fast cycle |
| Outer flame | 1 | 60% of count | Lifetime 1.3s — turbulent |
| **Total** | **2** | count | Additive blending — glow tự nhiên |

`triNoise3D` trong outer flame thêm ~6 texture ops/fragment.  
Dùng `count: 200` cho mobile.
