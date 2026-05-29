# ArchPlanLab AP5 — Extensions (sau bản 4-vật-liệu-lit)

> **Trạng thái:** Deferred — AP5 core đã xong (brick/concrete/wood/metal + none, lit).
> **Ngày ghi:** 2026-05-29
> **Revisit khi:** cần tường đa dạng/realistic hơn hoặc World render (BuildingFromPlan) khớp editor.

---

## Context

AP5 core: mỗi mặt tường chọn 1 trong 4 surface shader (`threejs-modules/shaders/fragment/*`),
màu lấy từ `colorIndex`, 1 slider `matScale`. Lit qua `MeshStandardNodeMaterial` (reuse `.colorNode`
của shader). Merge theo key `${material}:${colorIndex}:${matScale}`. 3 nhánh mở rộng còn hoãn:

---

## 1. Weathering overlay — **trung bình, đáng làm sớm nhất**
Hiện 4 vật liệu loại trừ nhau; `Weathering` shader (moss/dirt/rust/stain) chưa dùng. Spec AP5
gốc muốn slider "weathering [0.3]" CHỒNG lên vật liệu nền (gạch cũ rêu phong…).
- **Cần:** composite 2 node-graph — `mix(baseColorNode, weatheringColorNode, amount)` bằng TSL,
  hoặc nhân overlay. Build base shader + Weathering, lấy 2 `.colorNode`, mix → gán
  MeshStandardNodeMaterial.colorNode.
- **State:** thêm `weathering: number` (0–1) vào SegmentState → bump DESIGN_SCHEMA_V → 3; thêm key.
- **Feasibility:** trung bình. TSL `mix()` có sẵn. Điểm nghẽn: cân chỉnh để overlay không nuốt pattern.

## 2. BuildingFromPlan áp material khi render World — **thấp-trung bình**
AP4 JSON đã export `material`/`matScale` (instanceToJSON). `BuildingFromPlan.ts` hiện bỏ qua →
tường trong World scene vẫn MeshToon phẳng, KHÁC editor.
- **Cần:** nhân bản `makeSurfaceMaterial` + map material→shader sang BuildingFromPlan (hoặc tách
  helper dùng chung trong `archplan/` rồi import). `SegmentJSON` thêm `material?`/`matScale?` optional.
- **Feasibility:** thấp-trung bình — logic y hệt ArchPlanLab. Cân nhắc tách `wall-materials.ts`
  dùng chung để khỏi lặp (đủ 2 nơi dùng → vẫn dưới ngưỡng abstraction 3, cân nhắc khi làm).

## 3. Full per-material params (advanced) — **thấp, GUI bloat**
Hiện chỉ expose colorIndex + Pattern scale. Mỗi shader còn nhiều param (brick: mortar/variation;
concrete: seamW/fbm; metal: ridgesPerPanel/ridgeH; wood: grainAmp/seamFrac + darkColor).
- **Cách:** sub-folder "Advanced" trong mỗi wall folder, hiện param theo `material` đang chọn.
- **Feasibility:** thấp về kỹ thuật (setters có sẵn) nhưng GUI phình + state phình nhiều field.
  Chỉ làm khi user thực sự cần tinh chỉnh sâu.

---

## Quyết định
Hoãn cả 3. Thứ tự revisit: **1 (weathering) → 2 (World render) → 3 (advanced params)**.
Ý 1 cho "đa dạng vẻ cũ/mới" rẻ nhất về cảm nhận thị giác. Ý 2 cần khi xuất bản công trình ra World.
