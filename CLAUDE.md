# CLAUDE.md — Three.js Engine

> Tầng này quản lý: Three.js stack, module patterns, skills, build order, Living Index.
> KHÔNG can thiệp: ecosystem decisions, Babylon rules, asset structure (assets ở `../assets/`).
> ← Tầng trên: `../CLAUDE.md` (ecosystem overview)
> Skills: `../.claude/skills/` | Architecture: `ARCHITECTURE.md`

---

## Workspace layout (engine scope)

```
THREEJS/
├── 00-Threejs/        ← project chính (Vite + TS + Three.js 0.174)
├── threejs-modules/   ← thư viện module tái sử dụng (environment only)
├── validate.js        ← Three.js module/asset validator
├── update-index.js    ← cập nhật Living Index trong file này
└── check-imports.js   ← kiểm tra import path hợp lệ
```

Assets dùng chung: `../assets/[category]/[name]/production/` — không nằm trong thư mục này.
Character pipeline → `character-modules/` (Phase C, chưa tạo).

---

## Stack cố định

- Three.js **0.174** — verify API trong `node_modules/three/src/` trước khi dùng
- TypeScript **strict mode** — không dùng `any`, không dùng `!` non-null assertion
- Shader ưu tiên: **TSL > WGSL > GLSL** (GLSL phải có README giải thích lý do)
- Vite 6, ESLint, Husky commit gate

---

## 3 Quy tắc không ngoại lệ

**1. Dispose pattern** — mọi class có GPU resource (Geometry, Material, Texture, RenderTarget) phải có `dispose()` đầy đủ. Chi tiết: skill `dispose-pattern`.

**2. Performance budget** — draw calls < 100, triangles < 500k, texture ≤ 2048×2048. `RuntimeGuard` bắt buộc trong mọi World class có animation loop.

**3. Honest-Uncertain** — khi không chắc API tồn tại ở version 0.174, nói rõ trước khi dùng. Không tự bịa method name.

---

## Phase hiện tại — Phase A (Environment Foundation)

Build order:
1. `GlobalUniforms` (utils) — ✅ unit-pass
2. `RuntimeGuard` (utils) — ✅ unit-pass
3. `TriplanarMapping` (shaders) — chưa làm
4. `WorldNoise` (shaders) — chưa làm
5. `RoundedCorners` (shaders) — chưa làm

Target location: `threejs-modules/` (không phải `00-Threejs/src/` trực tiếp).

---

## Coding style

- Không comment trừ khi WHY không rõ từ code
- Không tạo file mới nếu có thể edit file hiện tại
- Không thêm error handling cho scenario không thể xảy ra
- Không add abstraction chưa cần — 3 dòng lặp tốt hơn abstraction sớm

---

## Quality gate — bắt buộc sau mọi thay đổi asset hoặc module

```
node validate.js ../assets/[category]/[name]       # sau khi thêm/sửa asset (từ thư mục THREEJS/)
node validate.js threejs-modules/[category]/[Name] # sau khi thêm/sửa module
node check-imports.js                               # sau khi Gemini copy module vào 00-Threejs/src/
```

Hook tự chạy validate.js sau mỗi lần Claude Code write/edit file trong `../assets/` hoặc `threejs-modules/`.  
Khi user chỉnh tay hoặc Gemini copy file → **phải chạy thủ công**.

**Caching:** validate.js bỏ qua nếu file không đổi (lưu hash tại `.validate-cache.json` — gitignored).  
**Registry:** sau mỗi asset PASS, `../assets/REGISTRY.json` tự update — không sửa tay file này.

---

## Shared AI Context

| File                      | Mục đích                                                                                   |
| ------------------------- | ------------------------------------------------------------------------------------------ |
| `../SYNC.md`              | Log quyết định + trạng thái workspace — **đọc đầu session**, ghi sau thay đổi lớn          |
| `deferred/`               | Tính năng đã nghiên cứu nhưng hoãn — mỗi file 1 tính năng, đọc trước khi đề xuất implement |
| `../assets/REGISTRY.json` | Index tổng hợp tất cả assets đã validate — auto-generated, không sửa tay                   |

---

## Quick Lookup — hỏi gì đọc đâu

| Câu hỏi                                     | Đọc ở đây                                  |
| ------------------------------------------- | ------------------------------------------ |
| API Three.js 0.174 có method X không?       | `node_modules/three/src/` — grep trực tiếp |
| Skill nào dùng cho tình huống này?          | Living Index → Skill Triggers              |
| Module nào đã build xong?                   | Living Index → Modules                     |
| Asset nào production-ready?                 | Living Index → Assets                      |
| Quyết định / context session trước?         | `../SYNC.md`                                   |
| Tính năng đã nghiên cứu nhưng hoãn?         | `deferred/README.md`                           |
| Workflow Gemini copy module → tích hợp?     | `../.claude/skills/module-handoff/SKILL.md` |
| Kế hoạch asset, budget tier, shaderProfile? | `../assets/ROADMAP.md`                         |

---

## Workflow 2 AI

| AI              | Vai trò                                                                    |
| --------------- | -------------------------------------------------------------------------- |
| **Gemini**      | Librarian — tìm/copy module từ `threejs-modules`, viết `SUMMARY.md`        |
| **Claude Code** | Adapter — đọc `SUMMARY.md`, tích hợp vào scene, update `.module-lock.json` |

Không sửa file trong `src/imported/[name]/` — giữ nguyên để diff.

---

## Living Index

> Auto-generated bởi `update-index.js` — **không sửa tay** phần trong thẻ `<!-- INDEX -->`.
> Cập nhật: mỗi lần mở session (SessionStart hook) + sau mỗi validate PASS.

### Scripts

<!-- INDEX:scripts -->
| Script             | Mô tả                                               |
| ------------------ | --------------------------------------------------- |
| `validate.js`      | Validate asset / module — caching + registry update |
| `check-imports.js` | Kiểm tra src/ không import từ raw/ hoặc optimized/  |
| `update-index.js`  | Cập nhật Living Index trong CLAUDE.md (file này)    |
<!-- /INDEX:scripts -->

### Skills (../.claude/skills/)

<!-- INDEX:skills -->
| Skill                | Khi nào dùng                                                                     |
| -------------------- | -------------------------------------------------------------------------------- |
| `dispose-pattern`    | Use when creating or modifying classes that own GPU resources in this Three      |
| `global-uniforms`    | Use when setting up shared uniforms across multiple shaders, syncing uTime/uWeat |
| `gltf-pipeline`      | Use when optimizing, cleaning, or compressing                                    |
| `module-handoff`     | Use when importing modules from threejs-modules library into the project, adapti |
| `new-module`         | Use when creating a new module in the threejs-modules library — scaffolding file |
| `performance-budget` | Use when adding new objects to a scene, creating animation loops, designing Worl |
| `shader-tsl`         | Use when writing or modifying shaders — vertex/fragment shaders, NodeMaterial, S |
| `triplanar-mapping`  | Use when applying world-space textures to meshes without UV coordinates, or when |
<!-- /INDEX:skills -->

### Skill Triggers — từ khóa → skill

<!-- INDEX:triggers -->
| Từ khóa nghe thấy                                                                                                               | Skill                |
| ------------------------------------------------------------------------------------------------------------------------------- | -------------------- |
| tạo class, tạo mesh, tạo object, thêm vào scene, geometry, material, texture                                                    | `dispose-pattern`    |
| uTime, uWeather, uDamage, global uniform, đồng bộ shader, sync shader, chia sẻ uniform, uniform chung                           | `global-uniforms`    |
| làm sạch model, tối ưu model, nén model, weld, draco, simplify mesh, import geometry, chuẩn bị model                            | `gltf-pipeline`      |
| lấy module, đưa module vào, copy module, adapt module, tích hợp module                                                          | `module-handoff`     |
| tạo module mới, thêm module, scaffold module, module mới trong threejs-modules, viết module, tạo shader module, tạo util module | `new-module`         |
| thêm object, thêm nhiều, tạo World, animation loop, FPS, draw call, nặng, lag, hiệu năng                                        | `performance-budget` |
| viết shader, tạo shader, shader cho, uniform, GLSL, đổ màu, bề mặt                                                              | `shader-tsl`         |
| tri-planar, triplanar, world-space texture, bypass UV, phủ texture không cần UV, texture theo normal, không cần UV              | `triplanar-mapping`  |
<!-- /INDEX:triggers -->

### Modules (threejs-modules/)

<!-- INDEX:modules -->
| Module           | Category | Version | Status    |
| ---------------- | -------- | ------- | --------- |
| `GlobalUniforms` | utils    | 1.0.0   | unit-pass |
| `RuntimeGuard`   | utils    | 1.0.0   | unit-pass |
<!-- /INDEX:modules -->

### Assets (assets/)

<!-- INDEX:assets -->
_assets/REGISTRY.json chưa có_
<!-- /INDEX:assets -->
