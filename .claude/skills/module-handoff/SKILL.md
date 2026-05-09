---
name: module-handoff
description: Use when importing modules from threejs-modules library into the project, adapting imported modules to the main scene, or updating .module-lock.json. Triggers when user says "import module", "pull from library", "adapt module", or when files in src/imported/ are modified. Also triggers on Vietnamese phrases: "lấy module", "đưa module vào", "copy module", "adapt module", "tích hợp module". Do NOT use for installing npm packages — that's a different workflow.
---

## Dependencies — Active đồng thời

Skill này YÊU CẦU apply cùng lúc:
- `dispose-pattern` — file tích hợp (`src/world/X.ts`) phải có dispose chain đầy đủ; module gốc thường không có pattern này

---

## Phân công vai trò

Workflow này có 2 AI với vai trò khác nhau — skill này chỉ bao gồm **vai trò Claude Code**:

| AI | Vai trò | Công việc |
|----|---------|-----------|
| **Gemini** | Librarian | Tìm module trong `threejs-modules`, copy vào `src/imported/`, viết `SUMMARY.md` |
| **Claude Code** | Adapter | Đọc `SUMMARY.md`, tích hợp vào scene chính, update lock file |

---

## Workflow Claude Code (4 bước)

**Bước 1 — Đọc SUMMARY.md trước, không làm gì khác**

```
src/imported/[ModuleName]/SUMMARY.md
```

SUMMARY.md chứa: props, dependencies, phần nào cần adapt, phần nào giữ nguyên.

**Bước 2 — Tích hợp vào scene chính**

- Target thường là `src/world/` hoặc `src/shaders/`
- Áp dụng đầy đủ `dispose-pattern` cho file tích hợp
- Không copy-paste thô — adapt theo context của scene hiện tại

**Bước 3 — KHÔNG sửa file trong `src/imported/[ModuleName]/`**

File gốc phải giữ nguyên để có thể diff với version mới từ library sau này.

**Bước 4 — Update `.module-lock.json` tại project root**

---

## Schema .module-lock.json

```json
{
  "modules": [
    {
      "name": "WaterShader",
      "category": "shaders",
      "commit-sha": "abc123def456",
      "imported-at": "2026-05-08",
      "status": "adapted",
      "integrated-into": "src/world/Ocean.ts"
    }
  ]
}
```

- `commit-sha` — SHA của commit trong `threejs-modules` repo lúc copy, để biết đang dùng version nào
- `status` — `"pending"` (copy xong chưa adapt) hoặc `"adapted"` (đã tích hợp xong)
- `integrated-into` — file trong project chứa code đã adapt

---

## Quyết định sau khi adapt xong

| Module | Action | Lý do |
|--------|--------|-------|
| ≤ 50 dòng, 1 file | Xóa `src/imported/[name]/` | Không cần giữ lại |
| Phức tạp hoặc cần diff sau | Giữ + thêm vào `.gitignore` | Để so sánh khi update |
| Mặc định | Xóa | Giữ repo gọn |

---

## Quy tắc cấm

- ❌ **KHÔNG sửa file trong `src/imported/[name]/`** — file gốc phải nguyên vẹn để diff
- ❌ **KHÔNG chạy `git pull` từ threejs-modules** — đó là việc của Gemini
- ❌ **KHÔNG quên update `.module-lock.json`** — mất track version → không biết đang dùng commit nào
- ❌ **KHÔNG bỏ qua `dispose-pattern`** khi viết file tích hợp — module gốc có thể không có pattern này

---

## Checklist verify sau khi adapt

- [ ] Đã đọc `SUMMARY.md` trước khi viết bất kỳ dòng code nào
- [ ] File tích hợp (`src/world/X.ts` hoặc `src/shaders/X/`) có đầy đủ dispose pattern
- [ ] `.module-lock.json` đã update — `commit-sha`, `status: "adapted"`, `integrated-into`
- [ ] `src/imported/[name]/` đã xóa hoặc thêm vào `.gitignore`
- [ ] Không có thay đổi nào trong `src/imported/[name]/` khi chạy `git diff`
