---
name: handoff-to-claude
description: Viết SUMMARY.md chuẩn để Claude Code đọc và tích hợp module vào project. Bắt buộc sau mọi module-find task.
triggers: "handoff", "giao cho claude", "viết summary", "báo claude", "SUMMARY.md"
---

## SUMMARY.md — Format bắt buộc

Tạo file `SUMMARY.md` tại root của project đang làm việc (ví dụ: `01-khu-pho-3d/SUMMARY.md`).

```markdown
# Module Handoff — [ModuleName]

## Module
- **Name:** [ModuleName]
- **Source:** threejs-modules/[category]/[ModuleName]/
- **Version:** [từ meta.json]
- **Three.js:** [three-version từ meta.json]

## Lý do chọn
[1-2 câu giải thích tại sao module này phù hợp với task]

## Files cần copy
```
threejs-modules/[category]/[ModuleName]/index.ts
threejs-modules/[category]/[ModuleName]/README.md
```

## API cần dùng

### Constructor
```typescript
new [ModuleName]({
  option1: value,   // bắt buộc — [giải thích]
  option2?: value,  // optional, default: X
})
```

### Methods
```typescript
instance.methodName(param)  // [giải thích ngắn]
instance.dispose()          // gọi khi cleanup
```

## Tích hợp vào scene

```typescript
// Đây là pseudo-code — Claude sẽ adapt theo World class thực tế
import { [ModuleName] } from './imported/[ModuleName]'

const m = new [ModuleName]({ option1: value })
scene.add(m.getMesh())  // hoặc equivalent
```

## Asset cần thiết
- [Nếu module cần texture/model: path từ assets/production/]
- [Nếu không cần: "Không cần asset ngoài"]

## Lưu ý cho Claude
- [Điều gì cần chú ý khi tích hợp]
- [Dependency nào cần có trước]
- [Vấn đề biết trước nếu có]

## Status
- [ ] Claude đã đọc
- [ ] Module đã copy vào src/imported/
- [ ] Tích hợp vào World class
- [ ] .module-lock.json đã update
```

---

## Sau khi viết SUMMARY.md

1. Thông báo cho user: "SUMMARY.md đã sẵn sàng tại [path]"
2. User sẽ trigger Claude Code đọc và tích hợp
3. **Không tự mình sửa code trong `src/`** — đó là việc của Claude

---

## Lỗi thường gặp

- ❌ **SUMMARY.md không có code snippet** → Claude phải đọc lại toàn bộ module
- ❌ **Không ghi Lưu ý cho Claude** → bỏ sót dependency hoặc gotcha
- ❌ **Path asset sai** → dùng `assets/[cat]/[name]/production/` không phải `raw/`
- ❌ **Tạo SUMMARY.md ở sai folder** → để trong project folder, không phải workspace root
