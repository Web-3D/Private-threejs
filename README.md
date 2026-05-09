# THREEJS Workspace

Workspace infrastructure cho dự án Three.js — AI instructions, quality gate scripts, và skill catalog.

## Cấu trúc

```
THREEJS/
├── CLAUDE.md              ← Claude Code instructions (luôn active)
├── GEMINI.md              ← Gemini CLI instructions
├── ARCHITECTURE.md        ← Design doc toàn workspace
├── validate.js            ← Quality gate: kiểm tra asset & module
├── check-imports.js       ← Integration check: phát hiện import sai stage
├── .claude/               ← Claude Code skills + hook config
├── .gemini/               ← Gemini CLI skills
│
├── 00-Threejs/            ← [submodule] Vite + TS + Three.js project
├── assets/                ← [submodule] Shared 3D asset library (Git LFS)
└── threejs-modules/       ← [submodule] Reusable shader/util library
```

Ba thư mục cuối là git repo riêng — không commit vào repo này.

## Chạy quality gate

```bash
node validate.js assets/[category]/[name]          # kiểm tra asset
node validate.js threejs-modules/[category]/[Name] # kiểm tra module
node check-imports.js                               # kiểm tra import trong 00-Threejs/src/
```
