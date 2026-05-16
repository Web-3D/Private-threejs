# RoundedCorners

SDF-based rounded rectangle shader cho `PlaneGeometry`. Dùng UV coordinates — không cần modify geometry. Dùng cho panel, floor decal, wall sign, UI overlay 3D.

## Props

| Prop | Type | Default | Mô tả |
|---|---|---|---|
| `radius` | `number` | `0.1` | Corner radius — fraction của nửa kích thước [0, 0.5]. 0.5 = hình tròn |
| `fillColor` | `ColorRepresentation` | `0xffffff` | Màu fill |
| `edgeSoftness` | `number` | `0.005` | Độ mềm của cạnh — anti-alias SDF edge |

## Usage

```typescript
import * as THREE from 'three'
import { WebGPURenderer } from 'three/webgpu'
import { RoundedCorners } from './RoundedCorners'

const panel = new RoundedCorners({ radius: 0.15, fillColor: 0x4488ff })
const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 1), panel.getMaterial())
scene.add(mesh)
```

## Công thức SDF

```
p = uv - 0.5                        → center UV tại (0,0)
q = abs(p) - (0.5 - r) + r         → SDF components
sdf = length(max(q, 0)) + min(max(q.x, q.y), 0) - r
alpha = 1 - smoothstep(-soft, soft, sdf)
```

- `sdf < 0` → bên trong (alpha = 1)
- `sdf ≈ 0` → cạnh, transition mịn
- `sdf > 0` → bên ngoài (alpha = 0, transparent)

## Lưu ý

- Yêu cầu `PlaneGeometry` (hoặc mesh nào có UV [0,1] standard)
- Material có `transparent = true` và `depthWrite = false` — sort thứ tự render cẩn thận khi overlap nhiều panel
- Không dispose texture vì không có texture — chỉ `material.dispose()`
- Để bo tròn hoàn toàn thành hình ellipse: `radius = 0.5`
