# decor-panel-true-recess-csg — lõm KHOÉT THẬT bằng CSG (deferred)

> Task A (decor panel) đã làm 2026-05-30: 'raised' = box nhô THẬT; 'recessed' = khung gờ molding
> nổi quanh ô (tâm phẳng → nhìn như lõm), KHÔNG khoét thủng. Lý do: tường là box solid + merge,
> additive geometry không khoét được hốc (mặt tường che mất hốc nếu chỉ cộng box).

## Khi nào cần
NgQuan muốn hốc tường THẬT (niche sâu, ô khoét lõm có đáy + 4 thành trong, đổ bóng trong hốc khi
xoay nắng) — molding-frame không đủ.

## Cách làm (đã khảo)
- **CSG subtract**: cần `three-bvh-csg` (dependency mới). Subtract 1 box khỏi mesh tường tại vị trí
  panel → hốc thật. Nhưng tường đang MERGE baked-to-world theo material key → phải CSG TRƯỚC merge,
  per-wall, tốn (BVH build mỗi wall). Cân nhắc perf nhiều nhà.
- **Hoặc mổ wall-builder**: `_buildWallSegments` chia mặt tường thành mảng quanh hình chữ nhật
  panel (như cách split quanh opening) + thêm 5 mặt pocket (đáy + 4 thành). Không cần dependency,
  nhưng logic split-box phức tạp hơn nhiều (đụng cả tương tác với openings).

## Hiện trạng (giữ)
- DecorPanel.mode = 'raised' | 'recessed' (molding-frame). Geometry: `_buildDecorPanels` trong
  `WallSingle.ts`. Material riêng qua `userData.matKey` + `_bakeToBucket` trong ArchPlanLab.
- Nếu thêm 'recessed-deep' (CSG) → thêm mode thứ 3, route sang nhánh CSG/wall-split.
