# WoodSidingWall

Tường **ván gỗ ngang** (clapboard / lap siding) **geometry thật**: `InstancedMesh` ~8–20 tấm ván
dài, nghiêng ra, chồng mép — mép dưới nhô tạo bóng đổ + dáng ván thật. Ca **lý tưởng** cho instanced
geometry (ít mảnh → cực rẻ).

## Vì sao wood ăn đứt brick (instanced)

| | InstancedBrickWall | **WoodSidingWall** |
| --- | --- | --- |
| Mảnh/tường 8×3m | ~1.400 viên | **~13 tấm** (ván rộng 235mm) |
| Mặt/mảnh | 5 (bỏ mặt sau) | **2** (bỏ sau + trên + 2 đầu) = 4 tris |
| Tris/tường | ~14.000 | **~64** |
| Policy | điểm nhấn/cận cảnh | **đại trà được** (cả trăm nhà vẫn nhẹ) |

**Tối ưu mặt:** mỗi tấm bỏ **mặt sau** (úp tường) + **mặt trên** (luồn dưới tấm trên) + **2 mặt đầu**
(±X, ở góc tường — khuất bởi tường kề) → còn **front + bottom = 2 mặt = 4 tris**. Mép dưới nhô +
nghiêng `tiltDeg` + bóng lap baked = dáng clapboard. *Mặt đầu chỉ lộ khi đầu hồi hở (không tường kề).*

## Usage

```typescript
import { WoodSidingWall } from 'threejs-modules/components/WoodSidingWall'

const wall = new WoodSidingWall({ width: 8, height: 3 }) // ~13 tấm, ~64 tris
scene.add(wall.getGroup())
console.log(wall.getTriangleCount())

wall.dispose()
```

## Props

Xem `meta.json`. Bắt buộc: `width`, `height`. `plankExposed` = chiều cao lộ mỗi tấm (reveal).

## Dispose

```typescript
wall.dispose() // backing + plank geo/mat, InstancedMesh
```
