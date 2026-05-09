# CLAUDE.md — Workspace Context

> File này load tự động mỗi session. Chứa quy tắc luôn active — không cần trigger.
> Chi tiết skills: `.claude/README.md` | Architecture: `ARCHITECTURE.md`
> Gemini context: `GEMINI.md` | Gemini skills: `.gemini/skills/`

---

## Workspace layout

```
THREEJS/
├── 00-Threejs/        ← project chính (Vite + TS + Three.js 0.174)
├── threejs-modules/   ← thư viện module tái sử dụng (environment only)
├── assets/            ← shared 3D asset library (buildings/characters/environments/props/textures)
└── .claude/skills/    ← 8/12 skills đã build
```

Asset pipeline: `raw/` (AI output) → `optimized/` (Blender MCP) → `production/` (gltf-transform, browser-ready).
Project chỉ import từ `assets/[category]/[name]/production/`.
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
1. `GlobalUniforms` (utils) — chưa làm
2. `TriplanarMapping` (shaders) — chưa làm
3. `WorldNoise` (shaders) — chưa làm
4. `RoundedCorners` (shaders) — chưa làm

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
node validate.js assets/[category]/[name]          # sau khi thêm/sửa asset
node validate.js threejs-modules/[category]/[Name] # sau khi thêm/sửa module
node check-imports.js                               # sau khi Gemini copy module vào 00-Threejs/src/
```

Hook tự chạy validate.js sau mỗi lần Claude Code write/edit file trong `assets/` hoặc `threejs-modules/`.  
Khi user chỉnh tay hoặc Gemini copy file → **phải chạy thủ công**.

**Caching:** validate.js bỏ qua nếu file không đổi (lưu hash tại `.validate-cache.json` — gitignored).  
**Registry:** sau mỗi asset PASS, `assets/REGISTRY.json` tự update — không sửa tay file này.

---

## Shared AI Context

| File | Mục đích |
|------|---------|
| `SYNC.md` | Log quyết định + trạng thái workspace — **đọc đầu session**, ghi sau thay đổi lớn |
| `deferred/` | Tính năng đã nghiên cứu nhưng hoãn — mỗi file 1 tính năng, đọc trước khi đề xuất implement |
| `assets/REGISTRY.json` | Index tổng hợp tất cả assets đã validate — auto-generated, không sửa tay |

---

## Workflow 2 AI

| AI | Vai trò |
|----|---------|
| **Gemini** | Librarian — tìm/copy module từ `threejs-modules`, viết `SUMMARY.md` |
| **Claude Code** | Adapter — đọc `SUMMARY.md`, tích hợp vào scene, update `.module-lock.json` |

Không sửa file trong `src/imported/[name]/` — giữ nguyên để diff.
