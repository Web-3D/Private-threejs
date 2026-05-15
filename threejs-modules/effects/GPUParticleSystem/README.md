# GPUParticleSystem

Base class cho mọi GPU-driven particle effect. Toàn bộ hạ tầng (geometry, material, uniforms, dispose) được xử lý sẵn — bạn chỉ cần cung cấp 4 builder functions bằng TSL.

**SparkSystem** là preset xây trên module này. Dùng `GPUParticleSystem` trực tiếp khi cần physics khác sparks: fire, smoke, magic, rain, snow, ...

## Core concept

```
GPUParticleSystem nhận 4 builder functions:
  buildPosition(ctx) → vec3   — cách particle di chuyển
  buildColor(ctx)    → vec3   — màu sắc theo thời gian
  buildSize(ctx)     → float  — kích thước pixel theo thời gian
  buildOpacity(ctx)  → float  — độ trong suốt theo thời gian
```

Mỗi function nhận `ParticleNodeContext` với các TSL node sẵn dùng.

## ParticleNodeContext

| Field | Type | Giá trị | Mô tả |
|---|---|---|---|
| `t` | `ParticleNode` | [0, 1] | Normalized phase trong lifetime |
| `tScaled` | `ParticleNode` | [0, lifetime] | Thời gian thực tính bằng giây |
| `bell` | `ParticleNode` | [0, 1] | `4t(1-t)` — đỉnh tại t=0.5, dùng cho size/opacity |
| `aDir` | `ParticleNode` | vec3 | Hướng ban đầu từ emitter shape |
| `aOffset` | `ParticleNode` | [0, 1] | Phase offset mỗi particle (tạo hiệu ứng stagger) |
| `uTime` | uniform | seconds | Global elapsed time |
| `uLifetime` | uniform | seconds | Lifetime hiện tại |

## Props

| Prop | Type | Default | Mô tả |
|---|---|---|---|
| `count` | `number` | `300` | Số particle |
| `lifetime` | `number` | `1.5` | Giây mỗi vòng lặp |
| `shape` | `'cone' \| 'sphere' \| 'disc'` | `'cone'` | Emitter shape (quyết định `aDir`) |
| `spread` | `number` | `Math.PI/4` | Góc mở (radian) |
| `blending` | `THREE.Blending` | `AdditiveBlending` | Blending mode |
| `depthWrite` | `boolean` | `false` | Depth write |
| `sizeAttenuation` | `boolean` | `false` | Pixel size cố định (không scale theo distance) |
| `buildPosition` | function | — | **Bắt buộc** — trajectory formula |
| `buildColor` | function | — | **Bắt buộc** — color curve |
| `buildSize` | function | — | **Bắt buộc** — size curve |
| `buildOpacity` | function | — | **Bắt buộc** — opacity curve |

## Usage — Fire Embers

```typescript
import * as THREE from 'three'
import { GPUParticleSystem } from './GPUParticleSystem'
import { color, float, mix, triNoise3D, uniform, vec3 } from 'three/tsl'

const uDrift = uniform(0.25)  // runtime-mutable

const embers = new GPUParticleSystem({
  count: 600,
  lifetime: 2.5,
  shape: 'disc',
  spread: Math.PI / 3,

  buildPosition: ({ aDir, tScaled, uTime }) => {
    const rise = vec3(0, float(0.8), 0).mul(tScaled)
    const drift = aDir.mul(uDrift).mul(tScaled)
    const noise = triNoise3D(drift.add(rise).mul(float(1.2)), float(0.5), uTime)
    return rise.add(drift).add(vec3(1, 0, 1).mul(noise.sub(float(0.5))).mul(float(0.5)))
  },
  buildColor: ({ t }) => mix(color(0xffcc44), color(0xff2200), t),
  buildSize: ({ bell }) => mix(float(2.0), float(7.0), bell),
  buildOpacity: ({ bell }) => bell.mul(float(0.9)),
})

scene.add(embers.points)

// Mỗi frame:
embers.update(clock.getElapsedTime())
```

## Runtime API

```typescript
system.update(time)          // bắt buộc mỗi frame
system.setLifetime(2.0)      // thay đổi lifetime runtime
system.dispose()             // cleanup geometry + material
```

## Physics recipes

### Parabolic trajectory (SparkSystem style)
```typescript
buildPosition: ({ aDir, tScaled }) => {
  const gravity = float(4.0)
  return aDir.mul(float(4.0)).mul(tScaled)
    .add(vec3(0, -1, 0).mul(gravity.mul(float(0.5)).mul(tScaled.mul(tScaled))))
}
```

### Rising with noise (fire/smoke)
```typescript
buildPosition: ({ aDir, tScaled, uTime }) => {
  const rise = vec3(0, float(0.8), 0).mul(tScaled)
  const drift = aDir.mul(float(0.3)).mul(tScaled)
  const noise = triNoise3D(drift.add(rise).mul(float(1.2)), float(0.5), uTime)
  return rise.add(drift).add(vec3(1, 0, 1).mul(noise.sub(float(0.5))).mul(float(0.5)))
}
```

### Orbit (magic circle)
```typescript
buildPosition: ({ t, tScaled }) => {
  const angle = t.mul(float(Math.PI * 2))
  const radius = float(1.5)
  return vec3(angle.cos().mul(radius), tScaled.mul(float(0.2)), angle.sin().mul(radius))
}
```

## Custom uniforms

Builder functions close over uniforms bạn tạo ngoài — update chúng mỗi frame theo ý muốn:

```typescript
const uWind = uniform(new THREE.Vector3(0.1, 0, 0.05))

const rain = new GPUParticleSystem({
  buildPosition: ({ aDir, tScaled }) => {
    return aDir.mul(float(5.0)).mul(tScaled).add(uWind.mul(tScaled))
  },
  // ...
})

// Mỗi frame: uWind.value.set(windX, 0, windZ)
```

## Lưu ý kỹ thuật

- **1 draw call** bất kể particle count — mỗi particle là 1 vertex
- **Additive blending** mặc định — sparks/fire/magic glow tự nhiên
- Geometry `position` toàn zeros — `positionNode` trong shader mới là vị trí thật
- `sizeAttenuation = false` — size tính bằng pixel, không scale theo depth
- Emitter position: di chuyển `system.points` trong scene — không cần uniform

## So sánh với SparkSystem

| | `GPUParticleSystem` | `SparkSystem` |
|---|---|---|
| Dùng khi | Custom physics, hiệu ứng mới | Sparks/fire/embers đơn giản |
| API | 4 builder functions | Props với defaults |
| Runtime control | Qua uniforms tự tạo | `setSpeed()`, `setGravity()`, ... |
| Complexity | Cao hơn | Thấp hơn |
