# TriplanarMapping

Phủ texture theo world-space bằng tri-planar sampling — không cần UV.

Sample texture 3 lần theo 3 mặt phẳng thế giới (XY, YZ, XZ), blend theo hướng normal.
Texture cố định trong không gian thế giới — mesh xoay nhưng texture không xoay theo.

## Khi nào dùng

- Mesh AI-generated (Tripo/Meshy) có UV xấu hoặc seam rõ
- Terrain, rock, ground — UV unwrap khó
- Object tái sử dụng nhiều lần với texture khác nhau

## Khi nào KHÔNG dùng

- Character skin — cần UV baked chính xác
- Asset có UV sạch, không có seam vấn đề

## Props

| Prop | Type | Default | Mô tả |
|---|---|---|---|
| `map` | `THREE.Texture` | required | Texture để phủ lên mesh |
| `scale` | `number` | `1.0` | World-space scale — giá trị lớn = texture nhỏ hơn |

## Usage

```typescript
import * as THREE from 'three'
import { TriplanarMapping } from './TriplanarMapping'

const map = new THREE.TextureLoader().load('/textures/rock.jpg')
map.wrapS = map.wrapT = THREE.RepeatWrapping

const triplanar = new TriplanarMapping({ map, scale: 2.0 })
const mesh = new THREE.Mesh(geometry, triplanar.getMaterial())
scene.add(mesh)

// Đổi scale runtime
triplanar.setScale(3.0)

// Cleanup — caller tự dispose texture
triplanar.dispose()
map.dispose()
```

## Performance

| Metric | Cost |
|---|---|
| Texture sample/fragment | 3× so với UV-mapped |
| Blend weight calc | ~4 ops/fragment — chấp nhận được |
| Uniform update | < 0.01ms/frame |

**Tri-planar tốn hơn UV-mapped 3×** — chỉ dùng khi mesh không có UV sạch.

## Lưu ý

- **Texture ownership**: `TriplanarMapping` không dispose `opts.map` — caller chịu trách nhiệm
- **WebGPU**: Dùng `WebGPURenderer` — `NodeMaterial` yêu cầu WebGPU backend
- **World-space**: Texture cố định trong không gian, không bám theo mesh khi rotate
