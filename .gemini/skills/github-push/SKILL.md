---
name: github-push
description: Workflow push code lên GitHub — stage, commit message chuẩn, push. Bao gồm pre-push checklist.
triggers: "push github", "commit", "đẩy code", "push lên", "tạo commit"
---

## Pre-push checklist — PHẢI check trước khi commit

- [ ] Không có file `.env` hoặc credentials trong staged files
- [ ] Không có file `raw/` hoặc `optimized/` trong assets (chỉ push `production/`)
- [ ] Không có `node_modules/` được track
- [ ] File size hợp lý — không push .glb > 50MB (dùng Git LFS hoặc CDN)
- [ ] TypeScript không có error (`tsc --noEmit`)

---

## Commit message format

```
[type]: [mô tả ngắn]

[body nếu cần — what + why, không phải how]
```

### Types

| Type | Khi nào |
|------|---------|
| `feat` | Thêm tính năng mới |
| `fix` | Sửa bug |
| `module` | Thêm/update module trong threejs-modules |
| `asset` | Thêm asset vào assets/ |
| `skill` | Thêm/update .claude hoặc .gemini skill |
| `docs` | Chỉ thay đổi documentation |
| `refactor` | Không thêm feature, không fix bug |
| `perf` | Cải thiện performance |

### Ví dụ tốt

```
feat: add GlobalUniforms singleton for shared uTime/uWeather/uDamage

module: add TriplanarMapping to threejs-modules/shaders/

asset: add quan-ca-phe building (Tripo → Blender MCP → production)

skill: add github-push skill to .gemini/
```

### Ví dụ xấu

```
update files          ← không mô tả gì
fix bug               ← bug gì?
WIP                   ← không commit WIP
```

---

## Lệnh push chuẩn

```bash
# 1. Check trạng thái
git status
git diff --staged

# 2. Stage files cụ thể (không dùng git add -A)
git add src/utils/GlobalUniforms.ts
git add threejs-modules/shaders/TriplanarMapping/

# 3. Commit
git commit -m "feat: add GlobalUniforms singleton"

# 4. Push
git push origin main
# hoặc nếu branch riêng:
git push origin feature/phase-a-modules
```

---

## File KHÔNG bao giờ commit

```
.env
*.local
node_modules/
assets/*/raw/        ← AI output thô — quá nặng
assets/*/optimized/  ← intermediate — không cần track
dist/
.DS_Store
```

Verify `.gitignore` có những pattern này trước khi push lần đầu.

---

## Lỗi thường gặp

- ❌ `git add .` → có thể stage file nhạy cảm hoặc file rác
- ❌ Push thẳng lên `main` khi làm feature lớn → tạo branch riêng
- ❌ Commit message tiếng Việt mix với English không nhất quán → chọn 1 ngôn ngữ
- ❌ Push file `.glb` > 50MB → GitHub reject, phải dùng Git LFS
