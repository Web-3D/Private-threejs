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

## Phase C — Character Pipeline _(chờ Phase B)_

Mục tiêu: VAT animation, billboard LOD, crowd pooling.

| #   | Module          | Category   | Status       | Dependency   |
| --- | --------------- | ---------- | ------------ | ------------ |
| 1   | `VATShader`     | shaders    | ⏳ chưa code | GlobalUniforms |
| 2   | `LODBillboard`  | components | ⏳ chưa code | LODSystem    |
| 3   | `CharacterPool` | utils      | ⏳ chưa code | RuntimeGuard |

---

## Phase D — Polish & Deploy _(chờ Phase C)_

Mục tiêu: post-processing, animation, dynamic lighting. Đạt performance budget → deploy.

Exit criteria: < 100 draw calls, < 500k tris, < 16.6ms/frame → live demo Vercel.

| #   | Module           | Category   | Status       | Dependency     |
| --- | ---------------- | ---------- | ------------ | -------------- |
| 1   | `PostProcessing` | components | ⏳ chưa code | GlobalUniforms |
| 2   | `WindAnimation`  | shaders    | ⏳ chưa code | WorldNoise     |
| 3   | `DayNightCycle`  | utils      | ⏳ chưa code | GlobalUniforms |

---

## Changelog

| Ngày       | Thay đổi                                                                   |
| ---------- | -------------------------------------------------------------------------- |
| 2026-05-14 | Phase B mở rộng — thêm `GPUParticleSystem` (base class), refactor `SparkSystem` thành preset (composition). Phase B: 5/5 unit-pass |
| 2026-05-13 | Phase B hoàn thành — 4/4 modules unit-pass (LODSystem, ProceduralFracture, InteriorMapping, SparkSystem) |
| 2026-05-13 | Phase A hoàn thành — 5/5 modules unit-pass |
| 2026-05-12 | Tạo file — tổng hợp từ `00-Threejs/ROADMAP.md` + `CLAUDE.md` Phase A build order |
