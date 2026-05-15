# ROADMAP.md — Three.js Engine Phases

> Source of truth cho toàn bộ hệ thống module của THREEJS engine.
> Trạng thái realtime: `SYNC.md` (snapshot) + Living Index trong `CLAUDE.md` (auto-update).
> Project timeline theo tuần → `00-Threejs/ROADMAP.md`.

---

## Phase A — Environment Foundation _(✅ hoàn thành 2026-05-13)_

Mục tiêu: nền tảng shader + util cho mọi scene. Không có Phase A → không build được gì tiếp.

Exit criteria: tất cả module unit-pass + 00-Threejs import ít nhất 1 shader thành công.

| #   | Module            | Category | Status       | Dependency      |
| --- | ----------------- | -------- | ------------ | --------------- |
| 1   | `GlobalUniforms`  | utils    | ✅ unit-pass  | —               |
| 2   | `RuntimeGuard`    | utils    | ✅ unit-pass  | —               |
| 3   | `TriplanarMapping`| shaders  | ✅ unit-pass  | GlobalUniforms  |
| 4   | `WorldNoise`      | shaders  | ✅ unit-pass  | GlobalUniforms  |
| 5   | `RoundedCorners`  | shaders  | ✅ unit-pass  | —               |

---

## Phase B — Advanced Environment & Splats _(✅ hoàn thành 2026-05-13)_

Mục tiêu: LOD, procedural destruction, interior occlusion, particle system.

| #   | Module               | Category   | Status       | Dependency        |
| --- | -------------------- | ---------- | ------------ | ----------------- |
| 1   | `LODSystem`          | utils      | ✅ unit-pass | RuntimeGuard      |
| 2   | `ProceduralFracture` | shaders    | ✅ unit-pass | WorldNoise        |
| 3   | `InteriorMapping`    | shaders    | ✅ unit-pass | GlobalUniforms    |
| 4   | `GPUParticleSystem`  | components | ✅ unit-pass | —                 |
| 5   | `SparkSystem`        | components | ✅ unit-pass | GPUParticleSystem |

---

## Module Gallery _(✅ hoàn thành 2026-05-14)_

Mục tiêu: giao diện trực quan cho toàn bộ module library — live Three.js canvas mini cho từng module.

- `gallery.html` + `gallery.ts` + `gallery.css` — trang gallery standalone trong `00-Threejs/`
- `galleryCard.ts` — DOM card builder, IntersectionObserver lazy-load
- `galleryModules.ts` — danh sách 10 modules + dynamic import factory
- 10 `example.ts` refactored sang `export async function createDemo(canvas)` pattern
- `vite.config.js`: thêm `threejs-modules` alias + gallery build entry + fix ESLint checker
- Truy cập: `http://localhost:3000/gallery.html`

---

## Phase C — Character Pipeline _(chờ Phase B)_

Mục tiêu: VAT animation, billboard LOD, crowd pooling.

| #   | Module          | Category   | Status       | Dependency   |
| --- | --------------- | ---------- | ------------ | ------------ |
| 1   | `VATShader`     | shaders    | ✅ unit-pass | GlobalUniforms |
| 2   | `LODBillboard`  | components | ✅ unit-pass | LODSystem    |
| 3   | `CharacterPool` | utils      | ✅ unit-pass | RuntimeGuard |

---

## Phase D — Polish & Deploy _(✅ hoàn thành 2026-05-15)_

Mục tiêu: post-processing, animation, dynamic lighting. Đạt performance budget → deploy.

Exit criteria: < 100 draw calls, < 500k tris, < 16.6ms/frame → live demo Vercel.

| #   | Module           | Category   | Status       | Dependency     |
| --- | ---------------- | ---------- | ------------ | -------------- |
| 1   | `PostProcessing` | components | ✅ unit-pass | GlobalUniforms |
| 2   | `WindAnimation`  | shaders    | ✅ unit-pass | WorldNoise     |
| 3   | `DayNightCycle`  | utils      | ✅ unit-pass | GlobalUniforms |

---

## Changelog

| 2026-05-15 | Phase D hoàn thành — PostProcessing (bloom WebGPU), WindAnimation (triNoise3D positionNode), DayNightCycle (sun arc + ambient lighting) |
| 2026-05-15 | Gallery update — thêm 6 modules Phase C + D: VATShader, LODBillboard, CharacterPool, PostProcessing, WindAnimation, DayNightCycle |
| Ngày       | Thay đổi                                                                   |
| ---------- | -------------------------------------------------------------------------- |
| 2026-05-14 | Module Gallery hoàn thành — gallery.html với 10 live Three.js canvas cards, lazy-load qua IntersectionObserver, refactor toàn bộ example.ts sang createDemo(canvas) pattern |
| 2026-05-15 | Phase C hoàn thành — CharacterPool unit-pass: generic pool<T>, acquire/release O(1), warnThreshold analog RuntimeGuard |
| 2026-05-15 | LODBillboard unit-pass: THREE.Sprite + SpriteMaterial, WebGPU auto-upgrade, LOD.addLevel với Object3D, getCurrentLevel() |
| 2026-05-15 | Phase C bắt đầu — VATShader unit-pass: positionNode + normalNode từ DataTexture, vertexIndex TSL, update(time) loop |
| 2026-05-14 | Phase B mở rộng — thêm `GPUParticleSystem` (base class), refactor `SparkSystem` thành preset (composition). Phase B: 5/5 unit-pass |
| 2026-05-13 | Phase B hoàn thành — 4/4 modules unit-pass (LODSystem, ProceduralFracture, InteriorMapping, SparkSystem) |
| 2026-05-13 | Phase A hoàn thành — 5/5 modules unit-pass |
| 2026-05-12 | Tạo file — tổng hợp từ `00-Threejs/ROADMAP.md` + `CLAUDE.md` Phase A build order |
