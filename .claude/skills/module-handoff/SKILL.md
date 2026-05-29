---
name: module-handoff
description: Use when importing modules from threejs-modules library into the project, adapting imported modules to the main scene, or updating .module-lock.json. Triggers when user says "import module", "pull from library", "adapt module", or when files in src/imported/ are modified. Also triggers on Vietnamese phrases: "lấy module", "đưa module vào", "copy module", "adapt module", "tích hợp module". Do NOT use for installing npm packages — that's a different workflow.
---

## Dependencies — Active đồng thời

Skill này YÊU CẦU apply cùng lúc:
- `dispose-pattern` — file tích hợp (`src/world/X.ts`) phải có dispose chain đầy đủ; module gốc thường không có pattern này

---

## Bối cảnh

Từ **2026-05-29** Gemini rời dự án — Claude đảm nhận **cả việc tìm/copy module (vai Librarian cũ) lẫn tích hợp (vai Adapter)**. Không còn handoff trung gian qua `SUMMARY.md`. `.module-lock.json` vẫn giữ để track version — đủ cho private library 1 người.

---

## Implementation checklist

- [ ] Đọc `threejs-modules/[category]/[Name]/README.md` + `meta.json` (status `unit-pass`, xem dependencies) **trước** khi copy
- [ ] Copy vào `src/imported/[ModuleName]/` — giữ nguyên, không sửa file gốc (để diff sau)
- [ ] Tạo/sửa file tích hợp trong `src/world/` hoặc `src/shaders/` — KHÔNG trong `src/imported/`
- [ ] Apply `dispose-pattern` cho file tích hợp — module gốc thường thiếu pattern này
- [ ] Update `.module-lock.json` — `commit-sha`, `status: "adapted"`, `integrated-into`
- [ ] Xóa `src/imported/[name]/` hoặc thêm vào `.gitignore` nếu module cần giữ để diff
- [ ] Chạy `node check-imports.js` — verify không import từ `raw/` hoặc `optimized/`

---

## Workflow (4 bước)

**Bước 1 — Tìm + copy module từ library**

```
threejs-modules/[category]/[ModuleName]/   → đọc README.md + meta.json
            ↓ copy nguyên trạng
00-Threejs/src/imported/[ModuleName]/
```

Ghi lại `commit-sha` của repo `threejs-modules` lúc copy — để biết đang dùng version nào. Không sửa gì trong bản copy.

**Bước 2 — Tích hợp vào scene chính**

- Target thường là `src/world/` hoặc `src/shaders/`
- Áp dụng đầy đủ `dispose-pattern` cho file tích hợp
- Không copy-paste thô — adapt theo context của scene (uniform names, camera setup, world scale thường khác giữa library và project)

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

## Performance budget

| Step                       | Cost       | Ghi chú                                     |
| -------------------------- | ---------- | ------------------------------------------- |
| Tìm + đọc README/meta.json | < 2 phút   | Đọc hết dependencies trước khi copy         |
| Viết file tích hợp         | 10–30 phút | Tùy độ phức tạp module                      |
| `node check-imports.js`    | < 3s       | Verify import paths                         |
| Update `.module-lock.json` | < 1 phút   | 4 fields — không bỏ qua                     |

**Không có runtime cost** — module-handoff là thao tác một lần, sau đó module sống trong `src/` như code bình thường.

---

## Quyết định sau khi adapt xong

| Module                     | Action                      | Lý do                 |
| -------------------------- | --------------------------- | --------------------- |
| ≤ 50 dòng, 1 file          | Xóa `src/imported/[name]/`  | Không cần giữ lại     |
| Phức tạp hoặc cần diff sau | Giữ + thêm vào `.gitignore` | Để so sánh khi update |
| Mặc định                   | Xóa                         | Giữ repo gọn          |

---

## Lỗi thường gặp

- ❌ **Sửa file trong `src/imported/[name]/`** → phá khả năng diff khi update module từ library sau này
- ❌ **Quên update `.module-lock.json`** → mất track version, không biết đang dùng commit nào
- ❌ **Bỏ qua `dispose-pattern` trong file tích hợp** → module gốc thường không có — phải tự thêm khi adapt
- ❌ **Copy-paste thô mà không adapt** → uniform names, camera setup, world scale thường khác giữa library và project
- ❌ **Không đọc README/meta.json trước khi copy** → adapt sai context, bỏ sót dependencies, mất thời gian fix sau

---

## Checklist verify sau khi adapt

- [ ] File tích hợp (`src/world/X.ts` hoặc `src/shaders/X/`) có đầy đủ dispose pattern
- [ ] `.module-lock.json` đã update — `commit-sha`, `status: "adapted"`, `integrated-into`
- [ ] `src/imported/[name]/` đã xóa hoặc thêm vào `.gitignore`
- [ ] Không có thay đổi nào trong `src/imported/[name]/` khi chạy `git diff`
