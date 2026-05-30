# WoodSidingStrip

Tường ván gỗ ngang dạng **"1 KHỐI" liền mạch**: 1 BufferGeometry gấp khúc răng cưa — mỗi tấm =
**slant (front, reveal) + step (butt vuông góc)** nối tiếp hết — + **plane lưng** cho tường kín.
Khác `WoodSidingWall` (InstancedMesh từng tấm).

## Vì sao "1 khối" (so với WoodSidingWall instanced)

| | WoodSidingWall (instanced) | **WoodSidingStrip (1 khối)** |
| --- | --- | --- |
| Cấu trúc | InstancedMesh N tấm | **1 plain mesh** liền |
| Tris/tường 8×3m | ~64 | **~42** (reveal 0.32 rộng) |
| Merge xuyên tường/nhà | ❌ (instanced khó merge) | ✅ **mergeGeometries** |
| Draw call (100 nhà) | ~nhiều (mỗi tường/cụm 1) | **1** (merge hết → 1 mesh) |
| Xuyên thấu từ trong | có nền box | **plane lưng kín** |

→ Per-tường tris gần như nhau (đòn 4 tris/tấm đã max). **Giá trị thật = MERGE được** → cho bước
**cross-house** (trăm nhà gỗ về 1 draw call). Đây là cái instanced không làm được.

## Hình (mặt cắt đứng)

```
   ‾\   ← step butt nghiêng tilt (− = overhang) — đổ bóng xuống slant dưới
     \
   ‾\ \
     \
 /‾‾‾  ← slant (front tấm, reveal)
```

`butt` 45mm + step nghiêng `stepTiltDeg` (mép butt = cạnh quay → **mượt, không singularity** như cách
`tan` cũ lộn ở 90°) → mặt step tự tối (Lambert) + **shadow map bắt được** bóng. **Bóng từ ÁNH SÁNG
THẬT** — không tô baked (vertex color chỉ jitter màu/tấm).

## Usage

```typescript
import { WoodSidingStrip } from 'threejs-modules/components/WoodSidingStrip'

const wall = new WoodSidingStrip({ width: 8, height: 3 }) // ~78 tris, 1 mesh
scene.add(wall.getMesh())

// Cross-house: gom geo nhiều tường → mergeGeometries → 1 mesh → 1 draw call
```

## Props

Xem `meta.json`. Bắt buộc: `width`, `height`.

## Dispose

```typescript
wall.dispose() // geo + mat
```
