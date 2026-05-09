# .gemini/ — Hệ thống Skills & Context cho Gemini

> Tương đương `.claude/` nhưng cho Gemini agent.
> Load tự động bởi Antigravity agent manager.

---

## Cấu trúc

```
.gemini/
├── README.md              ← file này
├── research/              ← output từ market-research skill
└── skills/
    ├── module-find/       ← tìm module trong threejs-modules/
    ├── handoff-to-claude/ ← viết SUMMARY.md cho Claude Code
    ├── github-push/       ← commit + push workflow
    └── market-research/   ← research AI 3D market
```

---

## Skill Index

| Skill | Trigger | Output |
|-------|---------|--------|
| `module-find` | "tìm module", "module nào dùng được" | Danh sách module phù hợp + API summary |
| `handoff-to-claude` | "handoff", "viết summary", "báo claude" | `SUMMARY.md` tại project folder |
| `github-push` | "push github", "commit", "đẩy code" | Commit + push hoàn tất |
| `market-research` | "research", "tool mới", "thị trường" | Report tại `.gemini/research/` |
| `asset-pipeline` | "thêm asset", "nhận GLB", "asset xong" | `meta.json` + catalog update |

---

## Workflow 2-AI

```
Gemini                          Claude Code
  │                                  │
  ├─ module-find                     │
  ├─ handoff-to-claude ──SUMMARY.md─►├─ module-handoff
  ├─ github-push ◄──────────────────-├─ (code xong)
  └─ market-research                 └─ (build shaders)
```

**Ranh giới rõ ràng:**
- Gemini: tìm, research, push, quản lý asset
- Claude Code: code, shader, tích hợp, adapt

---

## File quan trọng trong workspace

| File | Vai trò |
|------|---------|
| `GEMINI.md` | Context Gemini — load mỗi session |
| `PIPELINE_TONG_KET_v2.md` | Pipeline reference chính |
| `threejs-modules/README.md` | Module catalog |
| `assets/README.md` | Asset catalog + bộ luật |
| `CLAUDE.md` | Context Claude (đọc để hiểu ranh giới) |
