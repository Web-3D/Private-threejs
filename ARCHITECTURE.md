# ARCHITECTURE — THREEJS Workspace

## Workspace layout

```
THREEJS/
├── ARCHITECTURE.md      ← file này — toàn bộ architecture + pipeline
├── CLAUDE.md            ← rules active mỗi session (không sửa trực tiếp)
├── GEMINI.md            ← context cho Gemini AI
├── 00-Threejs/          ← project chính + testbed module (Vite + TS + Three.js 0.174)
├── threejs-modules/     ← code library tái sử dụng (shaders, utils) — nguồn gốc
├── assets/              ← 3D asset library dùng chung (buildings/characters/environments/props/textures)
└── .claude/skills/      ← 8/12 skills đã build
```

**Workflow 2 AI:**
| AI              | Vai trò                                                            |
| --------------- | ------------------------------------------------------------------ |
| **Claude Code** | Build source trong `threejs-modules/`, tích hợp vào `00-Threejs/`  |
| **Gemini**      | Tìm/copy module từ `threejs-modules/` → project, viết `SUMMARY.md` |

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
| **RoundedCorners**     | Normal hack tạo cạnh mềm                       | GlobalUniforms           |
| **ProceduralFracture** | Clip planes + vertex displacement              | GlobalUniforms           |
| **VATShader**          | Đọc VAT texture → replay animation trên GPU    | GlobalUniforms + VAT EXR |

### Layer 4 — LOD System

| Module               | Vai trò                           | Kích hoạt khi        |
| -------------------- | --------------------------------- | -------------------- |
| **LODBillboard**     | Thay character bằng flat sprite   | Distance > threshold |
| **InteriorMapping**  | Giả lập phòng bên trong tòa nhà   | Camera gần building  |
| **SplatIntegration** | Bridge Spark.js + Phase A shaders | Environment splat    |

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
              ┌─────────────────┼─────────────────┐
              ↓                 ↓                 ↓
       [TriplanarMapping] [WorldNoise]    [RoundedCorners]
       [ProceduralFracture][VATShader]   [InteriorMapping]
              └─────────────────┼─────────────────┘
                                ↓
                       [GlobalUniforms]
                   uTime / uWeather / uDamage
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

## Build order Phase A–D

```
Phase A — Environment Foundation   Phase B — Advanced Env          Phase C — Characters             Phase D — Polish
1. GlobalUniforms ✅               5. ProceduralFracture           9.  VATShader                    13. PostProcessing
2. TriplanarMapping ← NEXT         6. LODSystem                    10. LODBillboard                 14. WindAnimation
3. WorldNoise                      7. InteriorMapping              11. CharacterPool                15. DayNightCycle
4. RoundedCorners                  8. SplatIntegration             12. CharacterController
```

Tất cả module build vào `threejs-modules/` — copy vào project qua Gemini workflow.

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

## Roadmap

| Giai đoạn             | Tasks                                                                    |
| --------------------- | ------------------------------------------------------------------------ |
| **Tuần 1** (hiện tại) | ✅ GlobalUniforms · Setup Claude Desktop + Blender MCP                   |
| **Tuần 2–3**          | Trial 3D AI Studio · Code TriplanarMapping · Test Tripo→MCP→Three.js     |
| **Tuần 4–6**          | WorldNoise · RoundedCorners · **Phase A complete** · Demo asset đầu tiên |
| **Tuần 7–10**         | Phase B (LOD, Fracture, Interior, Splat)                                 |
| **Tuần 11–14**        | Phase C (VAT, CharacterPool)                                             |
| **Tuần 15–16**        | Phase D · Performance opt · Deploy Vercel                                |



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
