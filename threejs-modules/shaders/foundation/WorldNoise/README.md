# WorldNoise

Procedural animated noise dùng [`triNoise3D`](https://github.com/cabbibo/glsl-tri-noise-3d) trong world-space. Không cần UV. Dùng làm nền tảng cho `WindAnimation`, `ProceduralFracture`.

## Props

| Prop | Type | Default | Mô tả |
|---|---|---|---|
| `speed` | `number` | `1.0` | Tốc độ animation. 0 = đứng yên |
| `scale` | `number` | `1.0` | World-space scale — lớn hơn = noise feature nhỏ hơn |
| `color1` | `ColorRepresentation` | `0x000000` | Màu tại điểm noise thấp |
| `color2` | `ColorRepresentation` | `0xffffff` | Màu tại điểm noise cao |

## Usage

```typescript
import * as THREE from 'three'
import { WebGPURenderer } from 'three/webgpu'
import { WorldNoise } from './WorldNoise'

const noise = new WorldNoise({ speed: 1.0, scale: 2.0, color1: 0x001133, color2: 0x0066ff })
const mesh = new THREE.Mesh(geometry, noise.getMaterial())

// Trong animation loop:
const clock = new THREE.Clock()
function animate() {
  noise.update(clock.getElapsedTime())
  renderer.render(scene, camera)
}
```

## Runtime update

```typescript
noise.setScale(3.0)   // Thay đổi scale runtime
noise.setSpeed(0.5)   // Thay đổi tốc độ runtime
noise.update(time)    // Gọi mỗi frame với elapsed time
```

## Performance

| Operation | Cost |
|---|---|
| `triNoise3D` (3 octaves loop) | Medium — ~3× noise sample/fragment |
| World-space lookup | 0 overhead — built-in pipeline value |
| Uniform update mỗi frame | < 0.01ms |

World-space noise không phụ thuộc UV và không thay đổi khi mesh rotate — texture cố định trong không gian.

## Dùng làm building block

Phase B/D shaders có thể dùng `triNoise3D` từ `three/tsl` trực tiếp với `positionWorld`:

```typescript
import { triNoise3D, positionWorld, uniform } from 'three/tsl'
const uTime = uniform(0)
const noiseVal = triNoise3D(positionWorld.mul(2.0), 1.0, uTime)
// noiseVal là float TSL node — compose vào material
```

## Ownership

`WorldNoise.dispose()` chỉ dispose material. Caller quản lý geometry và renderer.
