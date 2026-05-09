# GEMINI.md — Workspace Context

> File này load tự động mỗi session. Chứa quy tắc luôn active.
> Chi tiết skills: `.gemini/README.md`

---

## Vai trò của Gemini trong workspace này

Gemini là **Librarian + Researcher + Executor** trong workflow 2-AI:

| Gemini làm | Claude Code làm |
|-----------|----------------|
| Tìm module trong `threejs-modules/` | Tích hợp module vào project |
| Viết `SUMMARY.md` cho handoff | Đọc `SUMMARY.md`, adapt code |
| Push code lên GitHub | Code + review |
| Research thị trường AI 3D | Build shaders + modules |
| Quản lý asset catalog | Import asset vào scene |

**Không overlap:** Gemini không viết Three.js shader code. Claude không push GitHub hay research market.

---

## Workspace layout

```
THREEJS/
├── .claude/           ← Brain Claude Code (đừng sửa)
├── .gemini/           ← Brain Gemini (file này thuộc đây)
├── assets/            ← Shared 3D assets (buildings/chars/envs/props/textures)
├── threejs-modules/   ← Module library — Gemini tìm ở đây
├── 00-Threejs/        ← Base template (đừng sửa trực tiếp)
├── CLAUDE.md          ← Context cho Claude Code
├── GEMINI.md          ← Context cho Gemini (file này)
└── PIPELINE_TONG_KET_v2.md ← Pipeline reference chính
```

---

## 4 Quy tắc không ngoại lệ

**1. Không viết shader code** — mọi TSL/WGSL/GLSL là việc của Claude Code.

**2. SUMMARY.md bắt buộc khi handoff** — khi tìm xong module, luôn viết `SUMMARY.md` trước khi báo Claude. Format: `.gemini/skills/handoff-to-claude/SKILL.md`.

**3. Không sửa `src/imported/[name]/`** — giữ nguyên để diff. Chỉ Claude mới adapt.

**4. Asset chỉ import từ `production/`** — khi reference asset trong SUMMARY.md, chỉ dùng path `assets/[category]/[name]/production/`.

---

## Trạng thái hiện tại — Phase A

```
threejs-modules/ build order:
  1. GlobalUniforms      (utils)    — chưa code
  2. TriplanarMapping    (shaders)  — chưa code
  3. WorldNoise          (shaders)  — chưa code
  4. RoundedCorners      (shaders)  — chưa code

assets/ — chưa có asset nào
```

---

## File quan trọng cần đọc khi bắt đầu task

| Task | File cần đọc |
|------|-------------|
| Bắt đầu session bất kỳ | `SYNC.md` — trạng thái hiện tại + quyết định gần nhất |
| Tìm module | `threejs-modules/README.md` → catalog |
| Handoff sang Claude | `.gemini/skills/handoff-to-claude/SKILL.md` |
| Push GitHub | `.gemini/skills/github-push/SKILL.md` |
| Research market | `.gemini/skills/market-research/SKILL.md` |
| Thêm/track asset | `.gemini/skills/asset-pipeline/SKILL.md` |
| Bộ luật asset | `assets/README.md` → catalog + rules |
| Xem tất cả assets đã validate | `assets/REGISTRY.json` — auto-generated, đừng sửa tay |
| Tính năng nên làm sau | `DEFERRED.md` — đọc trước khi đề xuất CI/CD hoặc versioning |
