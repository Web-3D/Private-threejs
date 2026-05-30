# SubdivideDisplaceWall

Tường gạch bằng **subdivide plane + vertex displace**: 1 PlaneGeometry chia lưới mịn, đẩy đỉnh Z
theo pattern gạch (gạch lồi, vữa lõm) → **1 mặt liền**, không box rời. Dựng để **so sánh** với
`InstancedBrickWall`.

## So với InstancedBrickWall

| | InstancedBrickWall (box) | **SubdivideDisplaceWall (displace)** |
| --- | --- | --- |
| Hình | box instanced, cạnh **SẮC** (gạch mới) | mặt liền, bậc **TRÒN/mềm** (gạch cũ/phong hoá) |
| Triangle | N viên × 10 | segX·segY·2 — **tự chọn qua subdivPerBrick** |
| Crisp bậc | sắc sẵn, tris tập trung ở viên | muốn sắc phải chia mịn → **tris cao hơn** |
| LOD | đổi → rebuild instance | **giảm subdiv = nhẹ ngay**, cùng 1 mesh |
| Height-map (Megascans) | không hợp | **hợp** — chỉ thay hàm displace bằng sample texture |
| Draw call | 1 | 1 |

**Kết luận thực tế:** muốn gạch **sắc/mới** → InstancedBrickWall rẻ hơn (tris tập trung). Muốn gạch
**mềm/phong hoá** hoặc dùng **height-map** + **LOD mượt** → SubdivideDisplaceWall. Để bậc sắc bằng
box thì cách này cần chia rất mịn → tris vượt → **không lợi hơn** cho gạch mới.

## Usage

```typescript
import { SubdivideDisplaceWall } from 'threejs-modules/components/SubdivideDisplaceWall'

const wall = new SubdivideDisplaceWall({ width: 8, height: 3, subdivPerBrick: 3 })
scene.add(wall.getGroup())
console.log(wall.getTriangleCount()) // so với InstancedBrickWall
```

## Props

Xem `meta.json`. Bắt buộc: `width`, `height`. `subdivPerBrick` cao = bậc sắc + nhiều tris.

## Dispose

```typescript
wall.dispose() // backing + skin geo/mat
```
