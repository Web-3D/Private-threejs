# ArchPlan Coordinate Scanner — True Per-Floor Geometry Slice

> Nâng cấp lưới Coordinate (mặt ngang Y) trong ArchPlanLab: thay vì footprint bbox,
> cắt geometry THẬT tại cao độ Y để đọc tọa độ tường đúng theo từng tầng.
>
> Liên quan: `01-Doraemon/src/sandbox/archplan/archplan-scene.ts` (HeightGridSystem.scanCYGrid),
> `systems/archplan-build-editor.md` (build editor tương tác)

---

## Hiện trạng (đã implement)

`HeightGridSystem` có lưới **Coordinate** = 1 mặt phẳng ngang trượt theo Y (`cyPos`),
cùng cơ chế measure (lưới mờ, sáng khi cao độ cắt khối nhà). Khi `cyPos ∈ [bbox.min.y,
bbox.max.y]` → vẽ outline **footprint = hình chữ nhật bbox** (`Box3.setFromObject`) +
4 nhãn mm = khoảng cách có dấu từ tâm 0 mặt phẳng XZ tới 4 cạnh ngoài cùng (X−/X+/Z−/Z+).

## Giới hạn

Dùng **bbox** nên outline + tọa độ là của **toàn khối** — KHÔNG đổi theo từng cao độ:
- Multi-floor footprint khác nhau mỗi tầng → vẫn chỉ thấy hộp bao chung.
- Tường trong (L/T/U-shape, cột, vách ngăn) không hiện — chỉ 4 cạnh ngoài.

## Đề xuất (chưa làm)

Cắt mặt phẳng Y với geometry thật → polyline mặt cắt đúng hình + tọa độ mọi tường tại
cao độ đó. Hướng khả thi:
1. **Mesh-plane intersection**: duyệt tam giác `buildingGroup`, cắt với mặt phẳng
   `y = cyPos` → tập đoạn thẳng → nối thành contour. Chuẩn nhưng tốn (CPU per-frame khi kéo
   slider — phải throttle / chỉ chạy onFinishChange).
2. **Dùng segment data sẵn có**: ArchPlan đã có `inst.segments` + transform per-floor.
   Tự dựng polyline tường của floor có `wallBase ≤ cyPos ≤ wallBase+wallH` → rẻ hơn nhiều,
   không cần đụng geometry. Ưu tiên hướng này vì data đã structured.

## Revisit khi

- Cần đọc tọa độ tường **trong** / vách ngăn, hoặc footprint **đúng từng tầng** (không phải bbox).
- Hoặc khi đẩy ArchPlanLab thành build editor tương tác (xem `systems/archplan-build-editor.md`)
  — lúc đó snap theo tọa độ tường thật là cần thiết.

## Feasibility

Hướng 2 (dựng từ `inst.segments`): ~nửa ngày, rủi ro thấp, không phụ thuộc geometry intersection.
Hướng 1 (mesh slice): 1–2 ngày, cần throttle + xử lý contour hở/đa khối — để sau cùng.
