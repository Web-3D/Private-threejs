---
name: module-find
description: Tìm module phù hợp trong threejs-modules/ catalog, đọc code, tóm tắt API để handoff sang Claude Code.
triggers: "tìm module", "module nào dùng được", "có module nào cho", "cần module"
---

## Thứ tự thực hiện

```
Bước 1: Đọc catalog
Bước 2: Match với yêu cầu
Bước 3: Đọc index.ts + README.md của module
Bước 4: Viết SUMMARY.md → handoff-to-claude skill
```

---

## Bước 1: Đọc catalog

File đầu tiên cần đọc: `threejs-modules/README.md`

Catalog liệt kê tất cả module theo category (shaders/utils/components/hooks).
Đọc cột Description để match với yêu cầu.

---

## Bước 2: Match với yêu cầu

```
Yêu cầu là gì?
├── Visual effect / texture / material → tìm trong shaders/
├── Math / lifecycle / state management → tìm trong utils/
├── Mesh + logic gộp lại → tìm trong components/
└── Event / resize / lifecycle → tìm trong hooks/
```

Nếu không match → báo "Không có module phù hợp, cần tạo mới" → Claude Code dùng `new-module` skill.

---

## Bước 3: Đọc module

Khi đã xác định module, đọc theo thứ tự:

1. `threejs-modules/[category]/[ModuleName]/meta.json` — version, dependencies, three-version
2. `threejs-modules/[category]/[ModuleName]/README.md` — usage, options table
3. `threejs-modules/[category]/[ModuleName]/index.ts` — class API thực tế
4. `threejs-modules/[category]/[ModuleName]/example.ts` — cách dùng

**Chú ý khi đọc `index.ts`:**
- Constructor options (bắt buộc / optional)
- Public methods (setters, getters)
- Có `dispose()` không
- Import gì từ bên ngoài

---

## Bước 4: Handoff

Sau khi đọc xong → chuyển sang skill `handoff-to-claude` để viết SUMMARY.md.

---

## Lỗi thường gặp

- ❌ Chỉ đọc README, không đọc `index.ts` → miss actual API
- ❌ Không check `meta.json` three-version → module có thể không compatible
- ❌ Handoff mà không có code snippet → Claude phải đoán cách dùng
