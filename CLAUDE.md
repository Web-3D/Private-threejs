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
├── check-imports.js   ← kiểm tra import path hợp lệ
└── scan-versions.js   ← detect Three.js version drift — chạy sau mỗi Three.js upgrade
```

Assets dùng chung: `../assets/[category]/[name]/production/` — không nằm trong thư mục này.
Effects/VFX → `threejs-modules/effects/` (GPUParticleSystem, SparkSystem ✅ Phase B).

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

## Phase hiện tại — Phase D ✅ HOÀN THÀNH (2026-05-15)

16 modules unit-pass — Phase A–D hoàn chỉnh. Target: `threejs-modules/`.
→ Tiến trình + next steps: [`/ROADMAP.md`](../ROADMAP.md) | Phase detail: [`ROADMAP.md`](ROADMAP.md)

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
| Script             | Mô tả                                                      |
| ------------------ | ---------------------------------------------------------- |
| `validate.js`      | Validate asset / module — caching + registry update        |
| `check-imports.js` | Kiểm tra src/ không import từ raw/ hoặc optimized/         |
| `update-index.js`  | Cập nhật Living Index trong CLAUDE.md (file này)           |
| `scan-versions.js` | Detect Three.js version drift — exit 1 nếu có module stale |
<!-- /INDEX:scripts -->

### Skills (../.claude/skills/)

<!-- INDEX:skills -->
| Skill                  | Khi nào dùng                                  |
| ---------------------- | --------------------------------------------- |
| `shared-gltf-pipeline` | Use when optimizing, cleaning, or compressing |
<!-- /INDEX:skills -->

### Skill Triggers — từ khóa → skill

<!-- INDEX:triggers -->
| Từ khóa nghe thấy                                                                                    | Skill                  |
| ---------------------------------------------------------------------------------------------------- | ---------------------- |
| làm sạch model, tối ưu model, nén model, weld, draco, simplify mesh, import geometry, chuẩn bị model | `shared-gltf-pipeline` |
<!-- /INDEX:triggers -->

### Modules (threejs-modules/)

<!-- INDEX:modules -->
| Module               | Category   | Version | Status    | Mô tả                                                                                                                          |
| -------------------- | ---------- | ------- | --------- | ------------------------------------------------------------------------------------------------------------------------------ |
| `LODBillboard`       | components | 1.0.0   | unit-pass | Swap 3D mesh → billboard sprite khi camera xa — tiết kiệm draw call và triangle count                                          |
| `OutlineShader`      | components | 1.0.0   | unit-pass | Per-object outline via BackSide scaled mesh — no post-processing, follows parent transform                                     |
| `PostProcessing`     | components | 1.0.0   | unit-pass | WebGPU post-processing pipeline with bloom effect — wraps Three.js PostProcessing class                                        |
| `FireSystem`         | effects    | 1.0.0   | unit-pass | GPU-driven fire — inner flame + outer turbulent flame, 2 draw calls, wind support                                              |
| `GPUParticleSystem`  | effects    | 1.0.0   | unit-pass | Base class for GPU-driven particle systems — define custom physics, color curves, and size envelopes via TSL builder functions |
| `SparkSystem`        | effects    | 1.0.0   | unit-pass | GPU-driven particle sparks — 100% vertex shader, zero CPU per-particle, additive blending                                      |
| `TrailSystem`        | effects    | 1.0.0   | unit-pass | Camera-facing ribbon trail behind moving objects — sword swing, vehicle, projectile                                            |
| `DissolveShader`     | shaders    | 1.0.0   | unit-pass | Noise-based dissolve effect with edge glow — spawn/despawn cinematic, death animation                                          |
| `InteriorMapping`    | shaders    | 1.0.0   | unit-pass | Parallax interior room illusion cho building window — 1 texture thay thế hàng trăm mesh                                        |
| `ProceduralFracture` | shaders    | 1.0.0   | unit-pass | Vertex displacement dọc theo normal bằng triNoise3D — giả lập vết nứt/fracture động                                            |
| `RoundedCorners`     | shaders    | 1.0.0   | unit-pass | UV-space SDF rounded rectangle — áp dụng lên PlaneGeometry, không cần modify geometry                                          |
| `TriplanarMapping`   | shaders    | 1.0.0   | unit-pass | Phủ texture theo world-space bằng tri-planar sampling — không cần UV                                                           |
| `VATShader`          | shaders    | 1.0.0   | unit-pass | Vertex Animation Texture shader — bake animation vào DataTexture, reconstruct trên GPU                                         |
| `WindAnimation`      | shaders    | 1.0.0   | unit-pass | Vertex displacement shader simulating wind using triNoise3D — animates foliage, grass, flags                                   |
| `WorldNoise`         | shaders    | 1.0.0   | unit-pass | Procedural world-space animated noise — dùng làm nền tảng cho wind, fracture, weather                                          |
| `CharacterPool`      | utils      | 1.0.0   | unit-pass | Generic object pool — pre-allocate slots, acquire/release không tạo mới GPU resource                                           |
| `DayNightCycle`      | utils      | 1.0.0   | unit-pass | Day-night cycle utility driving DirectionalLight sun arc and AmbientLight color by normalized time                             |
| `GlobalUniforms`     | utils      | 1.0.0   | unit-pass | Singleton cung cấp uTime/uWeather/uDamage đồng bộ cho mọi shader trong scene                                                   |
| `LODSystem`          | utils      | 1.0.0   | unit-pass | Wrap THREE.LOD với typed interface — swap mesh detail theo khoảng cách camera                                                  |
| `RuntimeGuard`       | utils      | 1.0.0   | unit-pass | Kiểm tra draw calls, triangle count, geometry leak mỗi frame                                                                   |
<!-- /INDEX:modules -->

### Assets (assets/)

<!-- INDEX:assets -->
_assets/REGISTRY.json chưa có_
<!-- /INDEX:assets -->
