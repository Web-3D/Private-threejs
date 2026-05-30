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

## Tường kín 5 mặt + cửa/sổ

- **5 mặt kín**: front răng cưa + plane lưng + **2 mặt bên ±X** (cap silhouette front→lưng, ~3 điểm/tấm).
- **Cửa/cửa sổ** (`openings`): `band()` chia dải gỗ tại mép lỗ → chỉ vẽ khoảng X đặc. Jamb reveal:
  **trái/phải XIÊN theo mặt cắt răng cưa** (band phát z front thật từng dải → đúng góc slant, không gờ
  phẳng); **head/sill** ngang bám `frontZ(mép)`. Bịt kín hốc rỗng. Toạ độ MÉT: `x` từ mép trái, `y` từ
  chân tường (cửa `y=0`, cửa sổ `y=` chiều cao bệ).
- **`round: true`** → lỗ **ELLIP** (fit bbox w×h): `solidSpans` cắt theo chord ellip, lấy mẫu Y mịn
  (~25mm) cho mượt; reveal cong tự bám chu vi (jamb band); bỏ head/sill (tròn không có cạnh ngang).
  Ellipse tính theo `y`/`h` **THẬT** (chưa clamp), chỉ RENDER trong tường → kéo `y` âm (xuống dưới
  sàn) hoặc `y+h` vượt đỉnh thì tường **clip** ellip thành **cửa bán nguyệt / cung** (chord phẳng ở
  mép, không co ellip lại vừa khít). Mép clip nằm đúng mặt ±Y nên cap đã bịt, không hở.

## Usage

```typescript
import { WoodSidingStrip } from 'threejs-modules/components/WoodSidingStrip'

const wall = new WoodSidingStrip({
  width: 8,
  height: 3,
  openings: [
    { x: 1.0, y: 0, w: 1.0, h: 2.1 }, // cửa ra vào (chạm sàn)
    { x: 4.0, y: 0.9, w: 1.2, h: 1.2 }, // cửa sổ (bệ 0.9m)
  ],
})
scene.add(wall.getMesh())

// Cross-house: gom geo nhiều tường → mergeGeometries → 1 mesh → 1 draw call
```

## Props

Xem `meta.json` + interface `WoodSidingStripOptions`. Bắt buộc: `width`, `height`. `openings?` = `WoodStripOpening[]`.

## Dispose

```typescript
wall.dispose() // geo + mat
```
