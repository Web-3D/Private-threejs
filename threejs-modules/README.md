# threejs-modules

> Thư viện module Three.js cá nhân — NgQuan86
> **Đọc file này trước** — đây là catalog toàn bộ.
> GitHub: https://github.com/NgQuan86/threejs-modules

---

## Cách dùng nhanh (cho Claude Code)

1. Tìm module trong bảng dưới
2. Đọc `[category]/[tên]/meta.json` → xem props, tags, deps
3. Đọc `[category]/[tên]/index.ts` → lấy code
4. Copy vào project — **KHÔNG sửa file trong repo này**
5. Dispose pattern phải được giữ nguyên khi adapt

---

## Shaders

| Tên                | Mô tả | Tags | Complexity | Three.js |
| ------------------ | ----- | ---- | ---------- | -------- |
| _(chưa có module)_ | —     | —    | —          | —        |

---

## Utils

| Tên            | Mô tả                                                   | Tags                                       | Complexity |
| -------------- | ------------------------------------------------------- | ------------------------------------------ | ---------- |
| RuntimeGuard   | Kiểm tra draw calls, triangles, geometry leak mỗi frame | performance, monitoring, debug             | low        |
| GlobalUniforms | Singleton đồng bộ uTime/uWeather/uDamage cho mọi shader | uniform, singleton, animation, shader-sync | low        |

---

## Components

| Tên                | Mô tả | Tags | Complexity | Deps |
| ------------------ | ----- | ---- | ---------- | ---- |
| _(chưa có module)_ | —     | —    | —          | —    |

---

## Hooks

| Tên                | Mô tả | Tags | Complexity |
| ------------------ | ----- | ---- | ---------- |
| _(chưa có module)_ | —     | —    | —          |

---

## Thêm module mới

Copy từ `_template/` trong category phù hợp.
Quy tắc đầy đủ trong `CLAUDE.md`.
