# ProceduralFracture

Vertex displacement shader — đẩy vertex dọc theo surface normal bằng `triNoise3D`. Tạo hiệu ứng vết nứt, fracture, bề mặt vỡ mà không cần bake texture hay modify geometry.

## Props

| Prop | Type | Default | Mô tả |
|---|---|---|---|
| `intensity` | `number` | `0.1` | Cường độ displacement — càng cao vertex bị đẩy càng mạnh |
| `scale` | `number` | `2.0` | World-space noise scale — giá trị cao = nứt nhỏ/dày hơn |
| `speed` | `number` | `0.3` | Tốc độ animation — 0 = tĩnh |
| `color1` | `ColorRepresentation` | `0x222222` | Màu vùng noise thấp (vết nứt tối) |
| `color2` | `ColorRepresentation` | `0x888888` | Màu vùng noise cao (bề mặt sáng) |

## Usage

```typescript
import * as THREE from 'three'
import { WebGPURenderer } from 'three/webgpu'
import { ProceduralFracture } from './ProceduralFracture'

const fracture = new ProceduralFracture({ intensity: 0.15, scale: 2.0, color2: 0x995533 })
const mesh = new THREE.Mesh(new THREE.SphereGeometry(1, 64, 64), fracture.getMaterial())
scene.add(mesh)

// Mỗi frame:
fracture.update(clock.getElapsedTime())
```

## Runtime API

```typescript
fracture.setIntensity(0.3)   // tăng fracture mạnh hơn
fracture.setScale(4.0)       // nứt nhỏ hơn, dày hơn
fracture.update(time)        // bắt buộc mỗi frame để animate
```

## Lưu ý

- Cần geometry có vertex count cao (subdivisions ≥ 32) để displacement trông mịn
- `speed: 0` → fracture tĩnh, dùng làm damaged surface không animate
- Kết hợp với `WorldNoise` để drive các effect khác cùng pattern
- Dùng `positionWorld` cho noise sampling → pattern cố định trong world space khi mesh rotate
