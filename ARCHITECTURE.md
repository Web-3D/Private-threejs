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
├── deferred/                    ← tính năng đã nghiên cứu, chưa build
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
    └── hooks/                   ← reusable hooks
```

**Shared (ecosystem level — không nằm trong thư mục này):**
- Skills: `../../.claude/skills/` — dùng chung cho tất cả engines
- Assets: `../assets/` — 3D asset library (git: threejs-assets)
- Sync log: `../SYNC.md`

**Workflow 2 AI:**
| AI              | Vai trò                                                             |
| --------------- | ------------------------------------------------------------------- |
| **Claude Code** | Build module trong `threejs-modules/`, validate, tích hợp `00-Threejs/` |
| **Gemini**      | Tìm/copy module từ `threejs-modules/` → project, viết `SUMMARY.md`  |

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
