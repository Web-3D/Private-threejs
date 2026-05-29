# ArchPlanLab → Interactive Build Editor (kiểu The Sims / SketchUp)

> **Trạng thái:** Deferred — nghiên cứu, chưa implement.
> **Ngày ghi:** 2026-05-29
> **Revisit khi:** quyết định đẩy ArchPlanLab từ "nhập param kiến trúc" thành **build editor tương tác đầy đủ**.

---

## Context

ArchPlanLab đã gom đủ bộ công cụ Build Mode: multi-floor, mặt bằng (▣/L/T/U/turtle),
tường + openings, foundation/slab/columns/roof, và cầu thang + đục lỗ sàn.
Khác The Sims ở chỗ: The Sims **grid-based** (snap tile, auto room) — đơn giản nhưng cứng;
ArchPlanLab **free-form parametric** (mm, turtle, xoay 360°) — linh hoạt hơn, gần SketchUp/Planner5D.

Tradeoff đã lộ: free-form ⇒ phải tự quản alignment. Cụ thể có **bug convention rotation**:
walls (`centerAndRotate` trong `archplan-build.ts`) dùng ma trận `[cos,-sin; sin,cos]`,
còn slab/stairs/foundation dùng **Three Ry** (`mesh.rotation.y`). Trùng khi `rotY=0`,
**lệch khi rotY ∈ {90,270}**. The Sims né được vì mọi thứ snap grid.

---

## 3 ý tưởng (có industry precedent — nên mượn, đừng tự nghĩ lại)

### 1. Grid snap tùy chọn — **ưu tiên cao, dễ nhất**
Toggle "Snap 0.5m": khi bật, làm tròn `posX/posZ/stair.x/stair.z` về bội số, `rotY/rotDeg` về bội 15°/45°.
- **Industry:** The Sims (grid cứng), SketchUp (snap + free toggle), Figma (snap to grid).
- **Feasibility:** ~nửa ngày. Chỉ là clamp ở GUI `onFinishChange`. Không đụng build math.
- **Lợi phụ:** giảm hẳn hệ quả bug convention rotation (góc vuông snap → ít lệch).

### 2. Room / floor auto-fill — **trung bình**
Turtle path khép kín → detect interior → tự sinh sàn polygon (thay vì phải bật slab thủ công + bbox chữ nhật).
- **Industry:** The Sims room detection; CAD "create face from boundary".
- **Feasibility:** trung bình. Đã có `pts[]` khép kín từ `walkTurtle`. `makeSlabWithHoles` đã dùng
  `THREE.Shape` từ polygon → tái dùng được: truyền turtle polygon thay vì rect bbox.
- **Điểm nghẽn:** shape lõm (L/U/T) cần polygon thật (không phải bbox); nhiều instance chồng nhau.

### 3. Wall auto-join — **khó, để cuối**
Ghép góc/miter tường giữa các shape kề nhau, khử mặt tường trùng.
- **Industry:** Revit / ArchiCAD wall join; Sims auto-merge walls.
- **Feasibility:** khó. Cần detect collinear/overlap segments giữa instances, tính miter joint.
  Chỉ làm khi có nhu cầu ghép nhiều shape thành 1 công trình liền mạch.

---

## Quyết định
Hoãn cả 3. Khi revisit: làm theo thứ tự **1 → 2 → 3** (độ khó tăng dần).
Ý 1 (grid snap) đáng làm sớm vì rẻ + fix luôn vụ rotation lệch. Nếu chỉ cần fix rotation mà
chưa làm editor, có thể thống nhất convention: đổi `centerAndRotate` sang Three Ry cho khớp slab.
