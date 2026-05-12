# CLAUDE.md — threejs-modules Library

> Đọc khi làm việc TRONG repo này (thêm/sửa module).
> Khi dùng module từ repo này, đọc README.md ở root.

---

## Quy tắc khi thêm module mới

1. Copy `_template/` từ category phù hợp (shaders/utils/components/hooks)
2. Đổi tên folder: `PascalCase` cho shader/component, `camelCase` cho util/hook
3. Điền đầy đủ `meta.json` — không để field trống
4. Viết `README.md` có ví dụ usage thực tế
5. Cập nhật bảng catalog trong `README.md` ở root repo

## Quy tắc bắt buộc

- Mọi class GPU phải có `dispose()` hoàn chỉnh (Geometry + Material + Texture)
- Không hardcode màu sắc, kích thước — dùng props với default value
- Không import từ đường dẫn `../` — dùng import tương đối trong folder module
- TypeScript only, không dùng `any` — mọi Uniforms shader phải có interface rõ ràng
- Một module = một folder độc lập, có thể copy ra dùng riêng lẻ
- **No Global State**: module không được đọc/ghi biến global (`window.*`, module-level singleton, store ngoài). Mọi dependency (scene, camera, renderer) phải được truyền qua constructor hoặc tham số hàm

## Cấu trúc module chuẩn

```
[category]/[ModuleName]/
├── index.ts       ← export chính, điểm vào duy nhất
├── example.ts     ← minimal scene chạy được, dùng để test visual
├── meta.json      ← metadata để search/index
└── README.md      ← props, usage, performance notes
```

`example.ts` bắt buộc — copy từ `_template/example.ts`, đổi class name, không cần hoàn hảo nhưng phải chạy được.

## Cập nhật README catalog

Khi thêm module mới, thêm 1 dòng vào bảng tương ứng trong `README.md` root:

- Tên = tên folder
- Mô tả ngắn gọn (< 10 từ)
- Tags từ meta.json
- Complexity từ meta.json
