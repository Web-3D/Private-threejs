# InstancedBrickWall

Tường gạch **geometry thật**: 1 box nền màu vữa + `InstancedMesh` hàng vạn viên gạch nhô,
xếp running-bond chừa khe = mạch vữa lõm. Khác `BrickWall` shader (phẳng) — cái này **bake ra
không phẳng** vì là khối thật, có bóng đổ thật trong rãnh.

## Vì sao InstancedMesh

| | Box rời + merge | Points (sprite) | **InstancedMesh** |
| --- | --- | --- | --- |
| Draw call | 1 | 1 | **1** |
| RAM | nặng (vạn geo) | nhẹ | **nhẹ** (1 geo + ma trận) |
| Rebuild | chậm (merge) | nhanh | **nhanh** (chỉ ma trận) |
| Khối/bóng thật | có | **không** (phẳng) | **có** |
| Triangle | N×12 | N×1 | **N×10** (đã bỏ mặt sau giáp nền) |

→ InstancedMesh xoá lo draw-call + RAM + lag-edit. Còn lại đúng 1 cái giá: **triangle = N×10**
(mặt sau viên úp vào nền vữa nên bỏ → 5 mặt/viên, đồng thời hết z-fight).
1 nhà cận cảnh OK; nhiều nhà → **LOD** (gần dùng cái này, xa fallback `BrickWall` shader phẳng).

## Khi nào dùng (LOD policy — chốt 2026-05-30)

**Dùng cho mảng trang trí + khu vực lui tới nhiều / cận cảnh hero** — KHÔNG đại trà mọi nhà.
Triangle budget hữu hạn → tiêu vào chỗ camera nhìn gần/lâu (cổng, mặt tiền điểm nhấn, sảnh, lối
đi chính). Nhà nền/xa dùng `BrickWall` shader phẳng hoặc bản baked. 2 đường cùng tồn tại = 2 cấp LOD.

## Usage

```typescript
import { InstancedBrickWall } from 'threejs-modules/components/InstancedBrickWall'

const wall = new InstancedBrickWall({ width: 8, height: 3 }) // chuẩn UK mặc định
scene.add(wall.getGroup())
console.log(wall.getTriangleCount()) // đo budget → quyết LOD

wall.dispose()
```

## Số đo chuẩn (default = Metric UK/EU BS EN)

Viên lộ 215×65mm, sâu nhô 12mm, mạch 10mm → bước ngang 225, hàng cao 75, lệch 112.5mm.
Đổi `brickL/brickH/joint` cho chuẩn VN (~210×60, mạch 10–12) hoặc US (194×57, 9.5).

## Props

Xem `meta.json`. Bắt buộc: `width`, `height` (m). Còn lại có default.

## Cửa/cửa sổ (`openings`)

`openings: { x, y, w, h }[]` (MÉT — x từ mép trái, y từ chân tường) → **đục xuyên 2 lớp**:
- **Gạch**: cull viên CHẠM lỗ (AABB overlap) → không viên nào dư ra trong lỗ.
- **Nền vữa**: KHOÉT lỗ thật (custom geo front/back clip) + **reveal tunnel 4 mặt** (vách 2 bên +
  bệ + đầu) → nhìn xuyên được, không còn nền đặc che. Reveal dùng chính vật liệu vữa.
- Giữa mép lỗ (rect) và mép gạch (lùi do overlap-cull) là viền vữa nền — như reveal vữa quanh ô.
- **`round: true`** → lỗ **ELLIP** (fit bbox w×h): nền cắt theo chord ellip (lấy mẫu Y ~25mm) + reveal
  cong phát theo band; gạch cull theo ellip-nở-nửa-viên (Minkowski) → gạch lấp đầy 4 góc bbox quanh tròn.
  Ellipse tính theo `y`/`h` **THẬT** (chưa clamp) cho cả nền lẫn cull gạch → kéo `y` âm / `y+h` vượt
  tường thì ellip bị **clip thành cửa bán nguyệt / cung** thay vì co lại vừa khít bbox.

```typescript
const wall = new InstancedBrickWall({
  width: 8, height: 3,
  openings: [{ x: 1, y: 0, w: 1, h: 2.1 }], // cửa chạm sàn
})
```

## Giới hạn (experimental)

- Mép tường: viên có tâm ngoài tường bị bỏ → có thể chừa mép vữa nhỏ (chưa clip viên mép).

## Dispose

```typescript
wall.dispose() // backing geo+mat, brick geo+mat, InstancedMesh
```
