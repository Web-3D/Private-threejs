# SYNC.md — Shared AI Context Log

> File này là **memory ngoài** dùng chung giữa Claude Code và Gemini.
> Đọc đầu mỗi session để biết trạng thái hiện tại mà không cần giải thích lại.
>
> ---
> **KHÔNG thay thế:**
> - `.claude/skills/module-handoff/` — quy trình Claude tích hợp module (HOW)
> - `.gemini/skills/handoff-to-claude/` — quy trình Gemini viết SUMMARY.md (HOW)
> - `SUMMARY.md` trong từng project — payload cụ thể của mỗi handoff (WHAT to integrate)
>
> **SYNC.md là gì:** Log các *quyết định* và *thay đổi trạng thái* workspace (API change,
> module mới, asset vào production...) để AI kia không cần hỏi lại khi resume.
> ---

---

## Trạng thái hiện tại

| Hạng mục | Trạng thái | Ghi chú |
|----------|-----------|---------|
| Phase A | 🔄 Chưa bắt đầu code | Build order: GlobalUniforms → TriplanarMapping → WorldNoise → RoundedCorners |
| threejs-modules | Chưa có module nào | Catalog trống |
| assets | Chưa có asset nào | REGISTRY.json trống |
| 00-Threejs | Template sạch | Chưa import module nào, `.module-lock.json` chưa có entry |

---

## Log quyết định (mới nhất lên đầu)

### 2026-05-09 — Claude Code
- Setup workspace root git repo (`THREEJS/`) — track AI instructions + scripts + skills
- Thêm `assets/REGISTRY.json` (auto-updated bởi validate.js sau mỗi asset PASS)
- Thêm caching vào `validate.js` — skip re-validate nếu file không đổi (hash MD5)
- Thêm `SYNC.md` (file này), `DEFERRED.md`
- Gitignored: `.validate-cache.json`, `settings.local.json`, 3 subproject repos

---

## Quy tắc ghi SYNC.md

**Ghi vào đây khi:**
- Tạo / xóa module trong `threejs-modules/`
- Import module vào project (update bảng Trạng thái)
- Asset mới vào `production/` (validate.js tự update REGISTRY.json, nhưng ghi note ở đây)
- Breaking change API của module (params đổi tên, method bị xóa...)
- Quyết định kiến trúc quan trọng ảnh hưởng cả 2 AI

**Không ghi:** bug fix nhỏ, format code, sửa typo, thêm comment.

**Format mỗi entry:**
```
### YYYY-MM-DD — [Claude Code | Gemini]
- [Nội dung thay đổi ngắn gọn — 1 dòng mỗi thay đổi]
```
