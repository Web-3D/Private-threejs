# ARCHITECTURE — THREEJS Workspace

## Workspace layout

```
THREEJS/                         ← Engine workspace (git: Private-threejs)
├── ARCHITECTURE.md              ← file này — toàn bộ architecture + pipeline
├── CLAUDE.md                    ← engine rules + Living Index (auto-updated)
├── README.md                    ← workspace entry point
├── validate.js                  ← quality gate: kiểm tra module + asset
├── check-imports.js             ← kiểm tra import path trong src/
├── update-index.js              ← cập nhật Living Index tự động
├── decisions/                   ← ADR — lý do đằng sau quyết định kiến trúc (thay đổi cấu trúc lớn)
├── deferred/                    ← tính năng đã nghiên cứu, chưa build
├── known-issues/                ← catalog lỗi thường gặp + cách sửa (KI-NNN, meta tag)
│
├── 00-Threejs/                  ← [repo: Threejs-template] KHUÔN MẪU dự án — clone riêng khi tạo project mới
│   ├── src/                     ← source code (world/, shaders/, utils/, templates/)
│   ├── vite.config.js           ← build config
│   └── CLAUDE.md                ← project-level coding rules
│
└── threejs-modules/             ← [Private-threejs] KHO VẬT LIỆU — tracked cùng engine repo
    ├── shaders/                 ← shader modules (TSL/GLSL)
    ├── utils/                   ← utility classes
    ├── components/              ← Three.js components
    ├── effects/                 ← VFX (GPUParticleSystem, SparkSystem, FireSystem, TrailSystem)
    ├── hooks/                   ← reusable hooks
    └── ui/                      ← widget DOM thuần (companion UI cho 3D tool) — vd Tabs
```

**Shared (ecosystem level — không nằm trong thư mục này):**
- Skills: `../../.claude/skills/` — dùng chung cho tất cả engines
- Assets: `../assets/` — 3D asset library (git: threejs-assets)
- Sync log: `../SYNC.md`

**Workflow (Claude solo từ 2026-05-29):**
| Giai đoạn | Việc                                                                                          |
| --------- | --------------------------------------------------------------------------------------------- |
| Build     | Build module trong `threejs-modules/`, validate (unit-pass)                                   |
| Import    | Tìm/copy module → `00-Threejs/src/imported/`, tích hợp vào scene, update `.module-lock.json`   |

---

## Định danh file — File Registry

> Mỗi file trong workspace có một vai trò duy nhất.
> Hỏi "file này làm gì?" → tìm tên ở đây.

### Root scripts — 6 công cụ tự động hóa

| Script | Vai trò | Khi chạy |
| --- | --- | --- |
| `validate.js` | Quality gate: kiểm tra structure module, meta.json fields, export pattern; cập nhật REGISTRY.json; bỏ qua nếu file không đổi (hash cache) | Sau mỗi thêm/sửa module hoặc asset — tự động qua hook |
| `check-imports.js` | Quét `src/` phát hiện import từ `raw/` hoặc `optimized/` — path bị cấm trong production | Sau khi copy module vào `00-Threejs/src/imported/` |
| `update-index.js` | Tái tạo hoàn toàn bảng Living Index (Scripts / Skills / Modules / Assets) trong CLAUDE.md | Tự động mỗi SessionStart + sau validate PASS |
| `scan-versions.js` | So sánh `three-version-verified` trong mọi meta.json với Three.js đang cài; exit 1 nếu có module stale | Sau mỗi `npm install three@x.x.x` |
| `find-unused.js` | 3 checks: stale import path trong `src/`, module có meta.json nhưng chưa ai import, file nằm ngoài chuẩn trong module folder | Định kỳ hoặc khi nghi ngờ orphan |
| `lint-shaders.js` | 4 checks: ShaderMaterial (phải NodeMaterial), inline GLSL string dài, console.log trong update(), thiếu README.md hoặc example.ts; exit 1 nếu vi phạm | Trước merge hoặc code review |

### Root docs — Tài liệu kỹ thuật

| File | Vai trò | Khi đọc |
| --- | --- | --- |
| `CLAUDE.md` | Engine rules + Living Index (auto-generated). Điểm vào cho mọi session Claude Code | Đầu mỗi session — không sửa phần `<!-- INDEX -->` thủ công |
| `ARCHITECTURE.md` | Kiến trúc 5 lớp, production pipeline, file registry | Khi cần big picture hoặc hỏi "file này làm gì" |
| `README.md` | Workspace entry point: sơ đồ, 3 thành phần cốt lõi, quick start | Lần đầu tiếp cận workspace |
| `ROADMAP.md` | Phase A–D plan, milestone log, next targets | Khi lên kế hoạch sprint hoặc bắt đầu phase mới |
| `WEEKLY-CHECK.md` | Checklist API drift: npm outdated, grep TSL node names, verify renderer.info | Đầu tuần — quan trọng sau Three.js release |
| `known-issues/README.md` | Catalog lỗi thường gặp + cách sửa (`KI-NNN`, meta tag category/severity/status). Khác `decisions/` (cấu trúc lớn) | Khi gặp triệu chứng lạ / trước khi sửa geometry-state-shader |

### Root config

| File | Vai trò |
| --- | --- |
| `.gitignore` | Exclude `00-Threejs/` (repo riêng), `.validate-cache.json`, `node_modules/` |
| `.gitattributes` | Line ending normalization (LF) cho mọi text file |
| `.validate-cache.json` | Hash cache của validate.js — gitignored, auto-generated, không sửa tay |

---

### threejs-modules/ — Thư viện module

**Config & tooling:**

| File | Vai trò |
| --- | --- |
| `package.json` | Dependencies của library: `three`, `typescript`, `@types/three` — không có bundler |
| `tsconfig.json` | Strict TS config (strictNullChecks, noImplicitAny, ES2020 target) |
| `eslint.config.js` | ESLint flat config cho TypeScript module source |
| `prettier.config.js` | Formatting rules — chạy qua pre-commit hook |
| `CLAUDE.md` | Quy tắc khi thêm module: naming, bắt buộc dispose(), no global state |
| `README.md` | Catalog tất cả modules theo category, usage snippet mỗi category |

**Anatomy của một module (`threejs-modules/[category]/[ModuleName]/`):**

| File | Vai trò | Bắt buộc |
| --- | --- | --- |
| `index.ts` | Export chính — API surface duy nhất ra ngoài | ✅ |
| `example.ts` | Minimal demo: `createDemo(canvas)` → `{ dispose() }` — dùng để visual test | ✅ |
| `meta.json` | Metadata: name, version, status, three-version-verified, description, tags, dependencies | ✅ |
| `README.md` | Props API, usage snippet, performance notes, dispose pattern | ✅ |

**Shaders subcategory (`threejs-modules/shaders/`):**

| Subfolder | Modules | Vai trò trong node graph |
| --- | --- | --- |
| `foundation/` | WorldNoise | Building block — không thuộc vertex hay fragment, chỉ tạo noise function |
| `vertex/` | WindAnimation, ProceduralFracture, VATShader | `positionNode` — dịch chuyển vertex trên GPU |
| `fragment/` | TriplanarMapping, InteriorMapping, RoundedCorners, DissolveShader | `colorNode` / `opacityNode` — xác định màu và opacity |
| `README.md` | — | Giải thích 3 subfolder, interface pattern, hướng dẫn thêm shader mới |

---

### 00-Threejs/src/templates/ — Base classes

| File | Vai trò | Kế thừa khi |
| --- | --- | --- |
| `BaseWorld.ts` | Canvas setup, WebGPU renderer, camera, resize handler, animation loop | Tạo World class mới |
| `BaseShader.ts` | Uniforms map, NodeMaterial creation, dispose pattern | Tạo shader wrapper class |
| `BaseComponent.ts` | Object3D độc lập: geometry + material + mesh + dispose chain | Tạo scene component |

### 00-Threejs/src/utils/ — Project utilities

| File | Vai trò |
| --- | --- |
| `GlobalUniforms.ts` | Singleton uTime / uWeather / uDamage — bridge đến threejs-modules/GlobalUniforms |
| `RuntimeGuard.ts` | Per-frame draw call + triangle budget monitor — bridge đến threejs-modules/RuntimeGuard |
| `InstancedMeshPool.ts` | InstancedMesh-based object pool: acquire/release O(1), no GPU alloc per spawn |
| `InteractionHelper.ts` | Raycasting + pointer event normalization: click, hover, drag trên 3D objects |
| `LoadingScreen.ts` | Asset loading progress UI: percentage overlay, hide on complete |
| `PostProcessingManager.ts` | Pipeline manager: scene pass → bloom → tone mapping output |
| `ResourceLoader.ts` | GLTFLoader + TextureLoader với caching: load once, reuse nhiều lần |
| `ViewportLinker.ts` | Sync nhiều canvas về cùng 1 scene state (split-screen, minimap) |

### 00-Threejs/src/gallery/ — Demo gallery app

| File | Vai trò |
| --- | --- |
| `modules.ts` | `MODULES[]` array — registry mọi demo entry: name, category, complexity, lazy import factory |
| `index.ts` | Gallery entry: render card grid, handle click → load demo vào canvas |
| `card.ts` | Single card component: tên module, category badge, complexity indicator |
| `README.md` | Hướng dẫn thêm demo mới vào gallery |

### 00-Threejs/src/world/ — Scene orchestration

| File | Vai trò |
| --- | --- |
| `World.ts` | Main scene orchestrator: extends BaseWorld, instantiates tất cả scene objects |

### 00-Threejs/ config — Build toolchain

| File | Vai trò |
| --- | --- |
| `vite.config.js` | Dev server port 3000, build → `../dist`, hot reload, TS path aliases |
| `tsconfig.json` | Strict TS, path aliases: `@/`, `@shaders/`, `@world/`, `@utils/`, `@templates/`, `threejs-modules/` |
| `eslint.config.js` | ESLint flat config với TypeScript rules |
| `prettier.config.js` | Formatting rules |
| `vitest.config.js` | Test runner config cho unit tests của module class |
| `.husky/pre-commit` | Git hook: `tsc --noEmit && eslint` — block commit nếu có type error hoặc lint error |
| `.env` / `.env.example` | Environment variables (API keys, dev flags) — `.env` gitignored |

### deferred/ — Tính năng nghiên cứu, chưa build

> Mỗi file = 1 tính năng đã research xong với "revisit khi" trigger rõ ràng.
> Đọc `deferred/README.md` trước khi đề xuất implement bất kỳ tính năng nào.

| File | Revisit khi |
| --- | --- |
| `turborepo-nx.md` | 5+ projects, build > 5 phút |
| `release-workflow.md` | Có collaborator hoặc muốn publish npm |
| `rag-knowledge.md` | 15+ modules hoặc 3+ projects |
| `asset-tag-search.md` | 30+ assets trong REGISTRY.json |
| `memory-vector-search.md` | 50+ memory files |
| `future-effects.md` | Cần thêm VFX (Phase E) |
| `future-shaders.md` | Cần thêm shader module (Phase E) |
| `future-postprocessing.md` | Cần DOF / motion blur / SSR |
| `character-base-variant.md` | Bắt đầu character system |

---

## Kiến trúc 5 lớp kỹ thuật

| AI Generation + Blender MCP + Three.js Shaders + Web Delivery |

### Layer 1 — AI Generation

| Công cụ          | Vai trò                                        | Output                | Dùng khi                         |
| ---------------- | ---------------------------------------------- | --------------------- | -------------------------------- |
| **Tripo**        | Generate geometry từ text/image, nhanh (8-10s) | `.glb`                | Prop, concept nhanh, NPC         |
| **Meshy**        | Generate geometry + PBR texture, print-ready   | `.glb` + texture maps | Cần texture AI kèm geometry      |
| **Rodin**        | Photorealistic 4K PBR, character siêu thực     | `.glb`                | Hero character                   |
| **Luma AI**      | Gaussian Splat từ video                        | `.ply` → `.spz`       | Background environment           |
| **3D AI Studio** | Aggregator: Tripo + Meshy + Rodin trong 1 sub  | —                     | $29/mo, thay trả riêng từng tool |

### Layer 2 — Processing Pipeline

| Công cụ            | Vai trò                                         | Input → Output                |
| ------------------ | ----------------------------------------------- | ----------------------------- |
| **Blender MCP**    | Cleanup, decimate, UV, bake, rig — 8-10x faster | `.glb` thô → `.glb` optimized |
| **gltf-transform** | Draco compress + KTX2 texture → browser-ready   | `.glb` → `.glb` production    |

### Layer 3 — Runtime Shaders (Three.js)

| Module                 | Vai trò                                        | Phụ thuộc                |
| ---------------------- | ---------------------------------------------- | ------------------------ |
| **GlobalUniforms**     | Sync `uTime`, `uWeather`, `uDamage` toàn scene | —                        |
| **TriplanarMapping**   | Phủ texture theo world position — bypass UV    | GlobalUniforms           |
| **WorldNoise**         | Surface micro-detail theo vị trí thế giới      | GlobalUniforms           |
| **RoundedCorners**     | SDF rounded corners trong UV space             | —                        |
| **ProceduralFracture** | Vertex displacement dọc normal = vết nứt động  | WorldNoise               |
| **InteriorMapping**    | Parallax room illusion qua cửa sổ tòa nhà     | GlobalUniforms           |
| **VATShader**          | Đọc VAT texture → replay animation trên GPU    | GlobalUniforms           |
| **WindAnimation**      | triNoise3D → positionNode displacement (gió)   | WorldNoise               |

### Layer 4 — LOD & Post-Processing

| Module               | Vai trò                                         | Kích hoạt khi        |
| -------------------- | ----------------------------------------------- | -------------------- |
| **LODBillboard**     | Thay character bằng flat sprite (THREE.LOD)     | Distance > threshold |
| **CharacterPool**    | Object pool — acquire/release O(1), crowd ready | Spawn/despawn nhiều  |
| **DayNightCycle**    | Sun arc + ambient color theo normalized time    | Outdoor scene        |
| **PostProcessing**   | scene pass → bloom → tone mapping (WebGPU)      | Emissive/HDR content |
| **SplatIntegration** | Bridge Spark.js + Phase A shaders               | Environment splat    |

### Layer 5 — Framework Base

| Template          | Vai trò                                             | Vị trí                      |
| ----------------- | --------------------------------------------------- | --------------------------- |
| **BaseWorld**     | Scene + Camera + Renderer + resize + dev tools      | `00-Threejs/src/templates/` |
| **BaseShader**    | Concrete class cho shader module, uniforms, dispose | `00-Threejs/src/templates/` |
| **BaseComponent** | Object 3D độc lập, tự dispose geometry/material     | `00-Threejs/src/templates/` |

### Sơ đồ dependencies

```
[Tripo / Meshy / Rodin]    [Luma AI]         [Unreal / Blender MCP]
         ↓                      ↓                       ↓
  [Blender MCP]           [.ply → .spz]          [VAT EXR bake]
         ↓                      ↓                       ↓
  [gltf-transform]        [Spark.js]            [VATShader]
         ↓                      ↓                       ↓
         └──────────────────────┴───────────────────────┘
                                ↓
                         [Three.js Scene]
                                ↓
              ┌─────────────────┼──────────────────────┐
              ↓                 ↓                      ↓
    [GlobalUniforms]      [RuntimeGuard]          [LODSystem]
       uTime/uWeather          ↓                      ↓
              ↓         [CharacterPool]         [LODBillboard]
    ┌─────────┼──────────────────────┐
    ↓         ↓         ↓            ↓
[TriplanarMapping][WorldNoise][InteriorMapping][DayNightCycle]
                       ↓
          [ProceduralFracture][WindAnimation]
                                ↓
                    [GPUParticleSystem] → [SparkSystem]
                    [VATShader]
                    [PostProcessing] ← scene pass → bloom
```

---

## Production pipeline 4 stages

```
[STAGE 1] AI GENERATION      [STAGE 2] BLENDER MCP         [STAGE 3] THREE.JS SHADERS    [STAGE 4] WEB DELIVERY
Input: text / image / video → Input: raw .glb            → Input: optimized .glb / splat → Input: built scene
Output: raw .glb / .ply       Output: optimized .glb        Output: browser scene           Output: production site
Tools: 3D AI Studio ($29/mo)  Tools: Claude Desktop + MCP   Tools: Three.js + Phase A       Tools: Vite + Draco
       Luma AI                Time: 5-10 min (8-10x)               + Spark.js                     + KTX2 + CDN
Time: 30s - 3 min/asset       ⭐ Multiplier tốt nhất 2026   ⭐ MOAT thực sự                 Bundle < 500KB gzip
```

**Nguyên tắc:** Không stage nào bỏ được. AI (quantity) → MCP (quality) → Shader (identity) → Build (delivery).

### Tool decision tree

```
Input là gì?
├─ Text prompt          → Tripo (nhanh) hoặc Meshy (texture đẹp hơn)
├─ Image character      → Rodin (photorealistic PBR)
├─ Image object/prop    → Meshy
├─ Video environment    → Luma AI (Gaussian Splat)
└─ Physical (LiDAR)     → Polycam (cần iPhone Pro)

Asset dùng cho gì?
├─ Hero character       → Rodin → Unreal rig → VAT bake
├─ NPC / crowd          → Tripo → Mixamo auto-rig
├─ Foreground object    → Meshy (texture sắc nét)
├─ Background env       → Luma AI (Splat)
└─ Quick prop / concept → Tripo
```

---

## Blender MCP — 7 workflows

> **Setup (1 lần ~30 phút):** Claude Desktop → Connectors → Blender → install addon → Blender `N` panel → BlenderMCP → Connect.
> Cần Blender 4.2+. Chỉ 1 instance cùng lúc (Desktop hoặc Cursor, không cả hai).

| #   | Workflow                 | Tóm tắt                                                                      | Hiệu suất            |
| --- | ------------------------ | ---------------------------------------------------------------------------- | -------------------- |
| A   | **Cleanup đơn**          | Import GLB → decimate → UV unwrap → bake AO → set origin → export Draco+KTX2 | 5-6x                 |
| B   | **Batch**                | Lặp mọi file trong folder: decimate 70% → atlas 2048 → export                | 15x                  |
| C   | **Scene từ description** | Tạo scene hoàn chỉnh (đường + quầy + cây + HDRI + camera) → export GLB       | —                    |
| D   | **Debug scene**          | List materials, polycount, duplicate, LOD suggestions, texture flag          | 10-12x               |
| E   | **Auto-rig character**   | Rigify → walk cycle → bake VAT EXR → export mesh + metadata                  | 8-10x                |
| F   | **Shader preview**       | Đọc TSL code → tạo Blender material match → render 4 angles                  | Debug trước khi code |
| G   | **Asset từ ảnh**         | Upload ảnh → recreate stylized low-poly → GLB cho Three.js                   | —                    |

---

## Performance budget

| Metric runtime   | Limit             |
| ---------------- | ----------------- |
| Draw calls/frame | < 100             |
| Triangles        | < 500,000         |
| Texture max      | 2048×2048         |
| Bundle gzipped   | < 500 KB          |
| Frame time       | < 16.67ms (60fps) |
| Initial load     | < 3s on 4G        |

| Asset type     | Polycount production | Texture max |
| -------------- | -------------------- | ----------- |
| Prop nhỏ       | < 500 tris           | 512×512     |
| Building       | < 5,000 tris         | 2048×2048   |
| NPC character  | < 10,000 tris        | 1024×1024   |
| Hero character | < 30,000 tris        | 2048×2048   |

---

## Key insights

1. **Shader Phase A = MOAT thực sự** — AI democratize generation, nhưng custom TSL/WGSL là rare skill. Visual identity không ai clone được dễ.
2. **Blender MCP = multiplier mạnh nhất 2026** — Free, setup 30 phút, 8-10x hiệu suất. Thay hoàn toàn Kaedim ($200-500/model).
3. **3D AI Studio = aggregator đúng đắn** — $29/mo thay $100+/mo trả riêng từng tool.
4. **Gaussian Splatting = production-ready 2026** — KHR extension cho glTF, Spark.js bridge, 100-1000x faster than NeRF.

---

## Reference

| Resource                        | Link                                                              |
| ------------------------------- | ----------------------------------------------------------------- |
| Blender MCP setup               | https://blender.org/lab/mcp-server/                               |
| Spark.js                        | https://sparkjs.dev/                                              |
| 3D AI Studio                    | https://www.3daistudio.com/                                       |
| Three.js TSL                    | https://github.com/mrdoob/three.js/wiki/Three.js-Shading-Language |
| GaussianSplats3D (Spark.js alt) | https://github.com/mkkellogg/GaussianSplats3D                     |
| Docs site (VitePress)           | https://docs-3d-ng.vercel.app                                     |
