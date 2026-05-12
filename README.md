# THREEJS — Production Workspace

> Bàn làm việc sản xuất Three.js trong hệ sinh thái Web-3D.
> ← Tầng trên: `../CLAUDE.md` (ecosystem overview)

---

## Sơ đồ workspace

```
┌─────────────────────────────────────────────────────────────────┐
│  THREEJS PRODUCTION WORKSPACE                                    │
│                                                                  │
│   KHO VẬT LIỆU                    KHUÔN MẪU DỰ ÁN               │
│  ┌─────────────────────┐          ┌──────────────────────┐       │
│  │  threejs-modules/   │ ──────►  │    00-Threejs/        │       │
│  │                     │  module  │                      │       │
│  │  shaders/  utils/   │ handoff  │  src/world/          │       │
│  │  components/ hooks/ │          │  src/shaders/        │       │
│  │                     │          │  src/utils/          │       │
│  └─────────────────────┘          └──────────────────────┘       │
│           ↑                                  ↑                   │
│      new-module skill               check-imports.js             │
│      validate.js                    CLAUDE.md rules              │
│                                                                  │
│  CÔNG CỤ & HỖ TRỢ KỸ THUẬT                                      │
│  ─────────────────────────────────────────────────────────────   │
│  validate.js       — quality gate: module + asset                │
│  check-imports.js  — kiểm tra import path hợp lệ                 │
│  update-index.js   — cập nhật Living Index tự động               │
│  CLAUDE.md         — engine rules + Living Index                 │
│  ARCHITECTURE.md   — kiến trúc 5 lớp + production pipeline      │
│  deferred/         — tính năng đã nghiên cứu, chưa build         │
│                                                                  │
│  SKILLS (ecosystem level: ../../.claude/skills/)                 │
│  new-module · module-handoff · shader-tsl · dispose-pattern      │
│  global-uniforms · triplanar-mapping · performance-budget        │
└─────────────────────────────────────────────────────────────────┘
```

---

## 3 thành phần cốt lõi

### 1. threejs-modules/ — Kho vật liệu
Thư viện module tái sử dụng. Mọi shader, util, component đều được
build và validate ở đây trước khi đưa vào dự án.

```
threejs-modules/
├── shaders/     ← TSL/GLSL shader modules (TriplanarMapping, WorldNoise...)
├── utils/       ← Utility classes (GlobalUniforms, RuntimeGuard...)
├── components/  ← Three.js scene components
└── hooks/       ← Reusable hooks
```

**Flow:** Build → `validate.js` PASS → Living Index update → sẵn sàng dùng.

### 2. 00-Threejs/ — Khuôn mẫu dự án
Template Vite + TypeScript + Three.js 0.174. Mọi dự án mới clone từ đây.

```
00-Threejs/src/
├── world/      ← World classes (extends BaseWorld)
├── shaders/    ← Shader instances
├── utils/      ← Project utilities
└── templates/  ← BaseWorld, BaseShader, BaseComponent
```

**Import module:** Gemini copy từ `threejs-modules/` → `src/imported/[name]/`
→ Claude Code adapt theo `module-handoff` skill.

### 3. Công cụ engine — Hỗ trợ kỹ thuật

| Tool | Chạy khi nào | Tác dụng |
|---|---|---|
| `validate.js` | Sau khi build/sửa module | Kiểm tra structure, meta.json, exports |
| `check-imports.js` | Sau khi Gemini copy module | Phát hiện import từ raw/ hoặc optimized/ |
| `update-index.js` | Tự động (SessionStart hook) | Sync Living Index trong CLAUDE.md |

---

## Shared resources (không nằm trong THREEJS/)

| Resource | Đường dẫn | Quản lý bởi |
|---|---|---|
| Skills | `../../.claude/skills/` | Web-3D-Ecosystem |
| 3D Assets | `../assets/` | threejs-assets repo |
| AI Context log | `../SYNC.md` | Web-3D-Ecosystem |
| Engine rules | `CLAUDE.md` | Private-threejs (file này) |

---

## Quick start — bắt đầu làm việc

```bash
# 1. Đọc trạng thái hiện tại
cat ../SYNC.md

# 2. Xem module nào đã có
cat CLAUDE.md   # → Living Index → Modules

# 3. Build module mới
# Dùng skill: new-module

# 4. Validate sau khi build
node validate.js threejs-modules/[category]/[ModuleName]

# 5. Tích hợp vào project
# Gemini: module-find → handoff-to-claude
# Claude: module-handoff skill
```

---

## Chi tiết kỹ thuật

→ [ARCHITECTURE.md](ARCHITECTURE.md) — kiến trúc 5 lớp, production pipeline, Blender MCP workflows, build order Phase A–D
