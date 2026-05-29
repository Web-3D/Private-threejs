# threejs-modules — pnpm Workspace Package

> Nâng cấp `threejs-modules/` từ thư mục source thuần túy thành proper pnpm workspace package.

## Vấn đề hiện tại

`threejs-modules/` không có `package.json` → không phải npm package thật. Khi copy module sang `00-Threejs/src/imported/`, import path phải fix tay. Ổn với < 15 modules, rườm rà hơn khi scale lên.

## Giải pháp đề xuất

1. Thêm `package.json` vào `threejs-modules/` với `exports` map
2. Link vào `00-Threejs` qua pnpm workspace protocol (`"threejs-modules": "workspace:*"`)
3. Import trực tiếp: `import { TriplanarMapping } from 'threejs-modules/shaders/TriplanarMapping'`

## Đã làm (2026-05-13)

- `exports` map thêm vào `threejs-modules/package.json`
- `00-Threejs/package.json` link qua `"threejs-modules": "file:../threejs-modules"`
- Cần chạy `npm install` trong `00-Threejs/` để activate link

Import sau khi install:
```typescript
import { RoundedCorners } from 'threejs-modules/shaders/RoundedCorners'
import { GlobalUniforms } from 'threejs-modules/utils/GlobalUniforms'
```

## Revisit khi

Muốn nâng lên **pnpm workspace** (cleaner symlink, faster): tạo `pnpm-workspace.yaml` ở root THREEJS, đổi `"file:../threejs-modules"` thành `"workspace:*"`. Cân nhắc khi có project thứ 2 (BABYLONJS) cần dùng chung.
