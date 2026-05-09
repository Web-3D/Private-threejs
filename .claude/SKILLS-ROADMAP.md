# Skills Roadmap — Three.js Project

> 12 skills tổng thể cho toàn bộ workflow dự án.
> 8/12 skills đã build. 4 skills còn lại — Phase B/C.

---

## Trạng thái hiện tại

| # | Skill | Status | Mức độ | Level |
|---|-------|--------|--------|-------|
| 1 | `dispose-pattern` | ✅ Done | Bắt buộc | Leaf |
| 2 | `shader-tsl` | ✅ Done | Bắt buộc | Level 2 |
| 3 | `performance-budget` | ✅ Done | Cao | Leaf |
| 4 | `module-handoff` | ✅ Done | Trung bình | Level 2 |
| 5 | `new-module` | ✅ Done | Cao | Orchestrator |
| 6 | `gltf-pipeline` | ✅ Done | Cao | Leaf |
| 7 | `global-uniforms` | ✅ Done | Cao | Level 2 |
| 8 | `triplanar-mapping` | ✅ Done | Cao | Level 2 |
| 9 | `new-project` | 📋 Phase B | Trung bình | Leaf |
| 10 | `world-class` | 📋 Phase B | Trung bình | Level 2 |
| 11 | `lod-system` | 📋 Phase B | Thấp | Level 2 |
| 12 | `vat-pipeline` | 📋 Phase C | Thấp | Level 2 |

---

## 8 Skills chưa build — Đánh giá chi tiết

---

### 5. `new-module` — Cao

**Mục đích:** Scaffold module mới trong `threejs-modules` đúng cấu trúc `_template`.

**Tại sao cần:**
Mỗi module cần 4 files (`index.ts`, `example.ts`, `meta.json`, `README.md`) + update catalog trong `README.md` root. Nếu không có skill này, AI dễ quên `example.ts` hoặc bỏ trống field trong `meta.json`. Đây là tác vụ lặp lại nhiều lần trong Phase A.

**Khi nào build:** Trước khi viết module đầu tiên (`TriplanarMapping`).

**Trigger:** "tạo module mới", "thêm module", "scaffold module", "new module in threejs-modules"

---

### 6. `new-project` — Trung bình

**Mục đích:** Tạo project mới từ `00-Threejs` — copy, đổi tên, reset `World.ts` về minimal state, update `package.json`.

**Tại sao cần:**
Thực hiện không thường xuyên (mỗi project mới). Tuy nhiên nếu không có skill, AI có thể quên clean `World.ts` cũ hoặc không update `package.json name`. Lỗi nhỏ nhưng gây nhầm lẫn sau.

**Khi nào build:** Khi cần tạo project thứ 2 trở đi — chưa cần gấp.

**Trigger:** "tạo project mới", "new project", "project mới từ template"

---

### 7. `gltf-pipeline` — Cao

**Mục đích:** Hướng dẫn đúng thứ tự `gltf-transform` steps: weld → simplify → normals → draco. Bao gồm các flag quan trọng và khi nào bỏ qua bước nào.

**Tại sao cần:**
Thứ tự sai → kết quả sai. Ví dụ: simplify trước weld → vertex seam bị vỡ. Draco trước normals → normal bị mất sau decompress. Skill này là "recipe" không cần nhớ.

**Khi nào build:** Trước khi import AI geometry lần đầu.

**Trigger:** "gltf-transform", "cleanup model", "optimize glb", "weld", "draco", "làm sạch model"

---

### 8. `triplanar-mapping` — Cao

**Mục đích:** Pattern cụ thể cho tri-planar shader: tính blend weights từ normal, sample texture 3 lần theo XY/YZ/XZ, blend kết quả.

**Tại sao cần:**
Tri-planar là foundation của toàn bộ environment shader pipeline. Công thức blend weight dễ sai (normalize, power, edge artifacts). Skill này là reference implementation để các shader khác (WorldNoise, RoundedCorners) follow.

**Khi nào build:** Cùng lúc hoặc ngay trước khi viết module `TriplanarMapping`.

**Trigger:** "tri-planar", "triplanar", "world-space texture", "bypass UV", "phủ texture không cần UV"

---

### 9. `global-uniforms` — Cao

**Mục đích:** Cách setup `GlobalUniforms` object, cách inject vào nhiều shader, cách update `uTime`/`uWeather`/`uDamage` từ animation loop.

**Tại sao cần:**
Nếu không có pattern rõ, mỗi shader tự manage uniform riêng → không sync được. Global uniforms là "single source of truth" cho toàn scene. Cần pattern nhất quán để mọi shader đều nhận đúng value.

**Khi nào build:** Trước hoặc cùng lúc viết module `GlobalUniforms`.

**Trigger:** "global uniform", "sync shader", "uTime", "uWeather", "uDamage", "đồng bộ shader"

---

### 10. `world-class` — Trung bình

**Mục đích:** Pattern tạo `World` class: setup scene/camera/renderer, animation loop, resize handling, dispose chain.

**Tại sao cần:**
`BaseWorld` template đã có sẵn và đã fix bug resize. Skill này chủ yếu nhắc khi extend BaseWorld — nên thêm gì, không thêm gì. Mức cần thiết trung bình vì template đã làm phần lớn công việc.

**Khi nào build:** Khi tạo World class đầu tiên trong project thật (không phải template).

**Trigger:** "tạo World class", "extends BaseWorld", "scene setup", "animation loop"

---

### 11. `lod-system` — Thấp

**Mục đích:** Pattern LOD: distance threshold, swap mesh/billboard, THREE.LOD vs custom implementation.

**Tại sao cần:**
LOD chỉ cần ở Phase B — sau khi đã có environment shader xong. Hiện tại chưa có object nào trong scene để LOD. Skill này là forward-looking.

**Khi nào build:** Phase B — sau khi TriplanarMapping + WorldNoise + RoundedCorners xong.

**Trigger:** "LOD", "level of detail", "billboard", "object xa camera", "distance threshold"

---

### 12. `vat-pipeline` — Thấp

**Mục đích:** Workflow VAT từ Unreal: export settings, texture format, vertex shader đọc position/normal từ VAT, frame sync với `uTime`.

**Tại sao cần:**
VAT là Phase C — dài hạn. Unreal pipeline chưa được setup. Skill này sẽ không được dùng trong ít nhất vài tháng tới.

**Khi nào build:** Phase C — khi bắt đầu character pipeline từ Unreal.

**Trigger:** "VAT", "vertex animation texture", "Unreal export", "character animation", "baked animation"

---

## Thứ tự build khuyến nghị

```
Ngay bây giờ (Phase A cần):
  5. new-module        ← trước khi viết TriplanarMapping
  7. gltf-pipeline     ← trước khi import AI geometry
  8. triplanar-mapping ← cùng lúc viết module
  9. global-uniforms   ← cùng lúc viết module

Sau Phase A (Phase B):
  10. world-class
  6.  new-project
  11. lod-system

Phase C (dài hạn):
  12. vat-pipeline
```

---

## Tổng đánh giá

| Mức độ | Skills | Lý do |
|--------|--------|-------|
| **Bắt buộc** | dispose-pattern, shader-tsl | Bug im lặng, tác động lớn nhất |
| **Cao** | performance-budget, new-module, gltf-pipeline, triplanar-mapping, global-uniforms | Dùng ngay trong Phase A |
| **Trung bình** | module-handoff, new-project, world-class | Hữu ích nhưng không gấp |
| **Thấp** | lod-system, vat-pipeline | Forward-looking, Phase B/C |
