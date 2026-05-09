# Skills Upgrade Log

> Theo dõi version history và upgrade roadmap cho từng skill.
> Cập nhật mỗi khi nâng cấp bất kỳ skill nào.

---

## Định nghĩa Level

| Level | Tên | Đặc điểm |
|-------|-----|-----------|
| **L0** | Flat | Không có dependency reference — tự xử lý mọi thứ |
| **L1** | Cross-reference passive | Đề cập skill khác nhưng không có block rõ ràng |
| **L2** | Explicit Dependencies | Có block `## Dependencies — Active đồng thời` ở đầu |
| **L3** | Orchestrator | Điều phối sub-skills theo thứ tự có cấu trúc |
| **L4** | Shared Constants | Shared config block dùng chung giữa nhiều skills _(chưa impl)_ |
| **L5** | Conditional Branching | Cây quyết định có nhánh skip/thêm bước _(chưa impl)_ |

---

## Upgrade History — Từng Skill

---

### 1. `dispose-pattern` — Leaf

| Version | Date | Thay đổi |
|---------|------|----------|
| 1.0 | Phase A | Tạo mới. 8-point checklist. GPU field typing. isDisposed guard. |

**Level hiện tại:** L0 (Leaf — không cần dependency)

**Upgrade tiềm năng:**
- **L4 Shared Constants:** Export danh sách GPU resource types (Geometry, Material, Texture, RenderTarget, BufferGeometry) để skills khác import, tránh liệt kê lại.
- **L5 Conditional Branching:** Nhánh riêng cho `InstancedMesh` (cần dispose geometry + material riêng từng instance) vs standard mesh.
- **Validation Section:** Thêm ví dụ "sai vs đúng" side-by-side cho từng trong 8 điểm checklist.

---

### 2. `shader-tsl` — Level 2

| Version | Date | Thay đổi |
|---------|------|----------|
| 1.0 | Phase A | Tạo mới. TSL > WGSL > GLSL hierarchy. Honest-uncertain rule. |
| 1.1 | Phase A | Nâng L1 → L2: thêm `## Dependencies — Active đồng thời` block. |

**Level hiện tại:** L2

**Upgrade tiềm năng:**
- **L5 Conditional Branching:** Nhánh `NodeMaterial` vs `ShaderMaterial` vs `RawShaderMaterial` — các điểm khác nhau về cách khai báo uniform và output.
- **Versioning:** Thêm `three-version: ">=0.174"` vào frontmatter để biết API nào còn valid.
- **TSL Node Catalog:** Danh sách nodes đã verify ở 0.174 (không phải toàn bộ Three.js docs — chỉ những node đã test thực).
- **Validation Section:** Ví dụ compile error thường gặp khi dùng TSL sai.

---

### 3. `performance-budget` — Leaf

| Version | Date | Thay đổi |
|---------|------|----------|
| 1.0 | Phase A | Tạo mới. RuntimeGuard class. draw call / triangle / texture budget. |

**Level hiện tại:** L0 (Leaf — không cần dependency)

**Upgrade tiềm năng:**
- **L5 Conditional Branching:** Budget khác nhau cho mobile vs desktop vs WebXR.
- **Shared Constants:** Export budget numbers (100 draw calls, 500k tris, 2048px) vào 1 nơi — skills khác reference thay vì hardcode lại.
- **Validation Section:** Ví dụ `inspector` output — cách đọc để phát hiện vấn đề budget.
- **GPU tier detection:** Nhánh adaptive budget dựa trên `renderer.capabilities`.

---

### 4. `module-handoff` — Level 2

| Version | Date | Thay đổi |
|---------|------|----------|
| 1.0 | Phase A | Tạo mới. Gemini→Claude handoff workflow. SUMMARY.md format. |
| 1.1 | Phase A | Nâng L1 → L2: thêm `## Dependencies — Active đồng thời` block. |

**Level hiện tại:** L2

**Upgrade tiềm năng:**
- **L5 Conditional Branching:** Nhánh khi `SUMMARY.md` thiếu field bắt buộc (fallback behavior).
- **Validation Section:** Checklist verify trước khi Gemini giao lại cho Claude (tránh incomplete handoff).
- **`.module-lock.json` schema:** Document chính xác schema của lock file để không bị drift.

---

### 5. `new-module` — Orchestrator (L3)

| Version | Date | Thay đổi |
|---------|------|----------|
| 1.0 | Phase A | Tạo mới. 6-step orchestration. Gọi dispose-pattern + shader-tsl + performance-budget. |

**Level hiện tại:** L3

**Upgrade tiềm năng:**
- **L4 Shared Constants:** Import meta.json required fields list từ shared config thay vì liệt kê trong skill.
- **L5 Conditional Branching:** Nhánh module type cụ thể hơn — ví dụ Hook module có pattern riêng (addEventListener cleanup trong dispose), Component module có getMesh() pattern riêng.
- **Auto-validate step:** Sau khi tạo xong, chạy script check 4 files đủ chưa, meta.json hợp lệ chưa.
- **Catalog auto-update:** Thay vì thủ công, tạo script đọc tất cả `meta.json` và generate bảng catalog tự động.

---

### 6. `gltf-pipeline` — Leaf

| Version | Date | Thay đổi |
|---------|------|----------|
| 1.0 | Phase A | Tạo mới. Pipeline order cứng: weld→simplify→normals→draco. Flag table. Skip table. |

**Level hiện tại:** L0 (Leaf — tool-specific, không cần Three.js dependency)

**Upgrade tiềm năng:**
- **L5 Conditional Branching:** Nhánh `ktx2` texture compression (cần `@gltf-transform/extensions`) cho Basis Universal.
- **L5 Conditional Branching:** Nhánh character vs environment vs prop — quy trình khác nhau (character cần giữ rigging, environment có thể simplify aggressively hơn).
- **Validation Section:** Checklist `gltf-transform inspect` output — số cụ thể cần kiểm tra (triangle count, texture size, animation channels).
- **Version pin:** `npx gltf-transform@3.x` — pin version để tránh breaking change.

---

### 7. `global-uniforms` — Level 2

| Version | Date | Thay đổi |
|---------|------|----------|
| 1.0 | Phase A | Tạo mới. Singleton pattern. 3 uniforms cố định (uTime, uWeather, uDamage). inject() pattern. |

**Level hiện tại:** L2

**Upgrade tiềm năng:**
- **L4 Shared Constants:** Export enum/const của 3 uniform names để import — tránh typo `utime` vs `uTime`.
- **L5 Conditional Branching:** Nhánh khi cần thêm custom global uniform (ví dụ `uSeason`) — quy trình extend GlobalUniforms đúng cách.
- **TSL version:** Pattern inject vào `NodeMaterial` (khác với ShaderMaterial — không có `uniforms` object theo nghĩa cũ).
- **Multi-scene support:** Singleton hiện tại assume 1 scene — document cách handle khi cần 2 scene độc lập.

---

### 8. `triplanar-mapping` — Level 2

| Version | Date | Thay đổi |
|---------|------|----------|
| 1.0 | Phase A | Tạo mới. Math formula. TSL implementation. blendSharpness default 8.0. Texture ownership rule. |

**Level hiện tại:** L2

**Upgrade tiềm năng:**
- **L5 Conditional Branching:** Nhánh Normal Map triplanar (cần re-orient normal từ tangent space mỗi projection) vs Albedo triplanar (current implementation).
- **L5 Conditional Branching:** Nhánh animated triplanar (uTime-driven scroll) vs static.
- **Validation Section:** Debug color visualization — output `vec3(weights.x, weights.y, weights.z)` để verify blend đúng.
- **WorldNoise integration:** Pattern kết hợp triplanar + WorldNoise để break tiling — document interface chung.
- **Detail map:** Triplanar với 2 lớp texture (base + detail) — pattern overlay/multiply.

---

### 9–12. Skills chưa build

| Skill | Phase | Dự kiến Level |
|-------|-------|---------------|
| `new-project` | B | L2 (dep: dispose-pattern) |
| `world-class` | B | L2 (dep: dispose-pattern, performance-budget, global-uniforms) |
| `lod-system` | B | L2 (dep: dispose-pattern, performance-budget) |
| `vat-pipeline` | C | L2 (dep: dispose-pattern, shader-tsl, global-uniforms) |

---

## Upgrade Types — Tổng quan

Các loại upgrade có thể apply cho bất kỳ skill nào:

| Upgrade Type | Tác dụng | Khi nào apply |
|--------------|----------|---------------|
| **L1 → L2** | Thêm explicit Dependencies block | Khi skill bị trigger mà quên apply dependency |
| **L2 → L3** | Biến thành Orchestrator với sub-skill calls | Khi 1 task cần ≥ 3 skills phối hợp theo thứ tự |
| **Shared Constants (L4)** | Shared config/const block | Khi ≥ 3 skills hardcode cùng 1 giá trị |
| **Conditional Branching (L5)** | Cây quyết định có nhánh | Khi skill có ≥ 2 paths hoàn toàn khác nhau |
| **Validation Section** | Side-by-side đúng/sai | Khi cùng 1 lỗi xuất hiện ≥ 2 lần |
| **Versioning** | `three-version` trong frontmatter | Khi API phụ thuộc version cụ thể |
| **TSL Node Catalog** | List nodes đã verify | Cho shader skills — tránh guess API |
| **Auto-validate script** | Shell command check output | Khi output có thể verify tự động |

---

## Cách cập nhật file này

Mỗi khi nâng cấp 1 skill:

1. Thêm row vào bảng **Upgrade History** của skill đó (Date + Thay đổi)
2. Update **Level hiện tại**
3. Xóa upgrade vừa thực hiện khỏi danh sách **Upgrade tiềm năng**
4. Nếu tạo skill mới → thêm section mới theo format trên

