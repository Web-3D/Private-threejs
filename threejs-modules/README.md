# threejs-modules

> Thư viện module Three.js cá nhân — NgQuan86
> **Đọc file này trước** — đây là catalog toàn bộ.
> GitHub: https://github.com/NgQuan86/threejs-modules

---

## Cách dùng nhanh (cho Claude Code)

1. Tìm module trong bảng dưới
2. Đọc `[category]/[tên]/meta.json` → xem props, tags, deps
3. Đọc `[category]/[tên]/index.ts` → lấy code
4. Copy vào project — **KHÔNG sửa file trong repo này**
5. Dispose pattern phải được giữ nguyên khi adapt

---

## Shaders

| Tên                  | Mô tả                                         | Tags                              | Complexity |
| -------------------- | --------------------------------------------- | --------------------------------- | ---------- |
| `TriplanarMapping`   | Texture không cần UV — blend 3 mặt phẳng      | triplanar, terrain, uv-free       | medium     |
| `WorldNoise`         | 3D noise field trong world space              | noise, wind, animation            | low        |
| `RoundedCorners`     | SDF rounded box trong fragment shader         | sdf, ui, stylized                 | low        |
| `ProceduralFracture` | Vertex displacement dọc normal = vết nứt động | fracture, displacement, vertex    | low        |
| `InteriorMapping`    | Parallax room illusion qua cửa sổ tòa nhà    | interior, parallax, building      | medium     |
| `VATShader`          | Vertex Animation Texture — replay GPU animation từ DataTexture | vat, animation, gpu, vertex | high |
| `DissolveShader`     | Noise-based dissolve với edge glow — spawn/despawn cinematic   | dissolve, noise, vfx, tsl   | low  |
| `WindAnimation`      | Vertex displacement giả lập gió — triNoise3D positionNode | wind, foliage, displacement, tsl | medium |

---

## Utils

| Tên              | Mô tả                                                   | Tags                                       | Complexity |
| ---------------- | ------------------------------------------------------- | ------------------------------------------ | ---------- |
| `RuntimeGuard`   | Kiểm tra draw calls, triangles, geometry leak mỗi frame | performance, monitoring, debug             | low        |
| `GlobalUniforms` | Shared TSL nodes uTime/uWeather/uDamage — import trực tiếp, không cần inject() | uniform, tsl, animation, shader-sync | low        |
| `LODSystem`      | Wrap THREE.LOD — typed levels, auto/manual update       | lod, performance, distance                 | low        |
| `CharacterPool`  | Generic object pool — acquire/release O(1), zero GPU alloc | pool, crowd, performance, reuse         | medium     |
| `DayNightCycle`  | Chu kỳ ngày-đêm — drive DirectionalLight + AmbientLight | lighting, day-night, animation, ambient    | low        |

---

## Effects

| Tên                  | Mô tả                                                        | Tags                                   | Complexity |
| -------------------- | ------------------------------------------------------------ | -------------------------------------- | ---------- |
| `GPUParticleSystem`  | Base class GPU particles — custom physics via TSL builders   | gpu, base-class, particles, extensible | medium     |
| `SparkSystem`        | GPU-driven sparks/embers — preset xây trên GPUParticleSystem | sparks, particles, vfx, gpu           | medium     |
| `FireSystem`         | GPU-driven fire — inner + outer flame, wind support           | fire, flame, particles, gpu, vfx      | medium     |
| `TrailSystem`        | Camera-facing ribbon trail — sword, vehicle, projectile       | trail, ribbon, motion, vfx            | medium     |

---

## Components

| Tên              | Mô tả                                                       | Tags                                       | Complexity |
| ---------------- | ----------------------------------------------------------- | ------------------------------------------ | ---------- |
| `LODBillboard`   | Swap 3D mesh → billboard sprite khi xa — tiết kiệm draw call | lod, billboard, sprite, crowd, performance | medium     |
| `PostProcessing` | WebGPU bloom pipeline — pass → bloom → tone mapping output  | post-processing, bloom, webgpu, effects    | medium     |
| `OutlineShader`  | Per-object outline via BackSide scaled mesh — no post-processing | outline, highlight, select, backside    | low        |

---

## Hooks

| Tên                | Mô tả | Tags | Complexity |
| ------------------ | ----- | ---- | ---------- |
| _(chưa có module)_ | —     | —    | —          |

---

## Thêm module mới

Copy từ `_template/` trong category phù hợp.
Quy tắc đầy đủ trong `CLAUDE.md`.
