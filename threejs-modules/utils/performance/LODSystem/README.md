# LODSystem

Wrap `THREE.LOD` với typed interface. Swap mesh tự động theo khoảng cách camera — giảm triangle count khi object ở xa.

## Props

| Prop | Type | Default | Mô tả |
|---|---|---|---|
| `levels` | `LODLevel[]` | — | Mảng mesh + distance, sắp xếp từ gần (distance 0) đến xa |
| `autoUpdate` | `boolean` | `true` | Renderer tự gọi update mỗi frame. Set `false` để tự gọi `update(camera)` |

### LODLevel

| Field | Type | Default | Mô tả |
|---|---|---|---|
| `mesh` | `THREE.Mesh` | — | Mesh cho level này — LODSystem sở hữu và dispose |
| `distance` | `number` | — | Khoảng cách để kích hoạt level này |
| `hysteresis` | `number` | `0` | Ngưỡng chống flickering tại ranh giới, fraction của distance |

## Usage

```typescript
import * as THREE from 'three'
import { LODSystem } from './LODSystem'

const lod = new LODSystem({
  levels: [
    { mesh: new THREE.Mesh(new THREE.IcosahedronGeometry(1, 4), mat), distance: 0 },
    { mesh: new THREE.Mesh(new THREE.IcosahedronGeometry(1, 2), mat), distance: 10 },
    { mesh: new THREE.Mesh(new THREE.IcosahedronGeometry(1, 0), mat), distance: 30 },
  ],
})

scene.add(lod.getLOD())

// autoUpdate = true (default) → không cần gọi thêm gì trong loop
// Nếu autoUpdate = false → gọi mỗi frame:
// lod.update(camera)
```

## Ownership

Các `mesh` trong `levels` được **LODSystem sở hữu** — `dispose()` sẽ tự dọn `geometry` + `material` của tất cả levels. Không gọi `mesh.geometry.dispose()` bên ngoài.

## Lưu ý

- `distance: 0` → level đầu tiên luôn là detail cao nhất (camera ở vị trí bất kỳ đều thấy level này trước)
- `hysteresis` phòng flickering khi camera ở đúng ranh giới distance — dùng `0.1`–`0.2` nếu thấy mesh nhấp nháy
- Kết hợp với `RuntimeGuard.check()` để verify triangle count giảm khi LOD hoạt động

## Performance

| Mesh | Detail | Approx triangles |
|---|---|---|
| IcosahedronGeometry(r, 4) | Cao | ~960 |
| IcosahedronGeometry(r, 2) | Trung | ~80 |
| IcosahedronGeometry(r, 0) | Thấp | ~20 |

LOD có hiệu quả nhất khi scene có nhiều object đồng thời. 1 object đơn lẻ thì lợi ích nhỏ.
