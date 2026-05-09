---
name: new-module
description: Use when creating a new module in the threejs-modules library — scaffolding files, setting up structure, or adding to the module catalog. Triggers when user wants to add a reusable module to the library. Also triggers on Vietnamese phrases: "tạo module mới", "thêm module", "scaffold module", "module mới trong threejs-modules", "viết module", "tạo shader module", "tạo util module". Do NOT use for importing existing modules into a project — that's the module-handoff skill.
---

## Orchestration — Thứ tự thực hiện

Skill này là **meta-skill** điều phối 3 skills khác. Thực hiện đúng thứ tự:

```
Bước 1: Xác định loại module
Bước 2: Scaffold 4 files
Bước 3: Apply dispose-pattern      ← sub-skill
Bước 4: Apply shader-tsl           ← sub-skill (nếu là shader)
Bước 5: Apply performance-budget   ← sub-skill (nếu có animation)
Bước 6: Update catalog
```

---

## Bước 1: Xác định loại module

```
Module này là gì?
├── Shader (visual effect, material) → folder: shaders/
├── Utility (math, lifecycle, state) → folder: utils/
├── Component (mesh + logic gộp)    → folder: components/
└── Hook (event, resize, lifecycle) → folder: hooks/
```

Xác định đúng folder trước — ảnh hưởng đến `meta.json` category.

---

## Bước 2: Scaffold 4 files bắt buộc

Mọi module phải có đủ 4 files — thiếu 1 là không hợp lệ:

```
threejs-modules/[category]/[ModuleName]/
├── index.ts      ← class chính + export
├── example.ts    ← usage demo có thể chạy độc lập
├── meta.json     ← metadata cho catalog
└── README.md     ← documentation ngắn
```

### `meta.json` schema

```json
{
  "name": "ModuleName",
  "category": "shaders",
  "version": "1.0.0",
  "description": "Mô tả ngắn 1 câu — dùng để search trong catalog",
  "dependencies": ["three"],
  "tags": ["environment", "texture", "world-space"],
  "three-version": ">=0.174"
}
```

Field bắt buộc: `name`, `category`, `version`, `description`, `three-version`.
Field `tags` giúp search sau này — đừng để trống.

### `index.ts` skeleton

```typescript
// threejs-modules/[category]/[ModuleName]/index.ts

import type * as THREE from 'three'

export interface [ModuleName]Options {
  // Khai báo options rõ ràng — không dùng any
}

export class [ModuleName] {
  private isDisposed = false
  // ... GPU fields với type | null

  constructor(opts: [ModuleName]Options = {}) {
    // khởi tạo
  }

  // setters với JSDoc + validation

  dispose(): void {
    if (this.isDisposed) return
    // dispose GPU resources
    this.isDisposed = true
  }
}
```

### `example.ts` skeleton

```typescript
// threejs-modules/[category]/[ModuleName]/example.ts
// Standalone demo — chạy được mà không cần project setup

import * as THREE from 'three'
import { [ModuleName] } from './index'

// Setup tối thiểu
const renderer = new THREE.WebGPURenderer()
const scene = new THREE.Scene()
const camera = new THREE.PerspectiveCamera(75, 1, 0.1, 100)

// Demo module
const module = new [ModuleName]({ /* options */ })
// ... add to scene, animate, dispose on cleanup
```

### `README.md` skeleton

```markdown
# [ModuleName]

Mô tả 1-2 câu.

## Usage

\`\`\`typescript
import { [ModuleName] } from 'threejs-modules/[category]/[ModuleName]'

const m = new [ModuleName]({ option: value })
scene.add(m.getMesh()) // hoặc equivalent
\`\`\`

## Options

| Option | Type | Default | Description |
|--------|------|---------|-------------|
| ...    | ...  | ...     | ...         |

## Dispose

\`\`\`typescript
m.dispose() // Giải phóng GPU memory
\`\`\`
```

---

## Bước 3: Apply `dispose-pattern`

Mở skill `dispose-pattern` và verify checklist 8 điểm cho class vừa tạo:

- [ ] `private isDisposed = false` ngay đầu class
- [ ] Method `dispose(): void` tồn tại
- [ ] Dòng đầu dispose là `if (this.isDisposed) return`
- [ ] Mọi GPU field có type `Type | null`
- [ ] Gọi `.dispose()` trên từng resource GPU
- [ ] `mesh?.parent?.remove(mesh)` trước khi null (nếu có mesh)
- [ ] Null toàn bộ reference sau dispose
- [ ] `this.isDisposed = true` là dòng cuối

---

## Bước 4: Apply `shader-tsl` (nếu module là shader)

Verify các điểm từ skill `shader-tsl`:

- [ ] Ưu tiên TSL — chỉ dùng WGSL/GLSL khi có lý do rõ
- [ ] Uniform prefix `u` cho mọi uniform
- [ ] Interface typed cho options (không dùng `any`)
- [ ] Setter có JSDoc + validation + clamp range
- [ ] Không truy cập `material.uniforms.uX.value` từ ngoài class
- [ ] Shader string > 5 dòng → tách ra file `.wgsl` riêng

---

## Bước 5: Apply `performance-budget` (nếu module có animation loop)

Module thường không tự chứa animation loop. Nhưng nếu có (ví dụ: animated particle system):

- [ ] Không tạo geometry/texture bên trong loop
- [ ] Xem skill `performance-budget` để biết thêm

Module không có loop → bỏ qua bước này.

---

## Bước 6: Update catalog

Thêm vào `threejs-modules/README.md` — bảng danh sách modules:

```markdown
| [ModuleName] | [category] | [mô tả ngắn] | ✅ |
```

Nếu README.md chưa có bảng, tạo section mới:

```markdown
## Module Catalog

| Module | Category | Description | Status |
|--------|----------|-------------|--------|
| [ModuleName] | shaders | ... | ✅ |
```

---

## Checklist tổng verify trước khi commit

- [ ] Đủ 4 files: `index.ts`, `example.ts`, `meta.json`, `README.md`
- [ ] `meta.json` có đủ 5 fields bắt buộc
- [ ] `dispose-pattern` checklist 8 điểm ✅
- [ ] `shader-tsl` checklist ✅ (nếu là shader)
- [ ] `example.ts` có thể chạy độc lập (không import từ project)
- [ ] Catalog trong `threejs-modules/README.md` đã update
- [ ] Không có `any` trong TypeScript
- [ ] Không có shader string > 5 dòng inline

---

## Lỗi thường gặp

- ❌ **Quên `example.ts`** → module không có demo, khó tái sử dụng
- ❌ **`meta.json` thiếu `three-version`** → không biết module compatible với version nào
- ❌ **`example.ts` import từ project** → không chạy được trong context khác
- ❌ **Không update catalog** → module tồn tại nhưng không tìm được
- ❌ **Class trong `index.ts` không có dispose** → vi phạm `dispose-pattern` cơ bản
