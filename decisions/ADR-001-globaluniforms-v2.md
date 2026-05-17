# ADR-001 — GlobalUniforms v2: Exported TSL Nodes

**Ngày:** 2026-05-16 | **Trạng thái:** Accepted  
**Revisit khi:** timerGlobal() built-in đủ ổn định để thay uTime hoàn toàn

## Context

GlobalUniforms v1 dùng singleton class với `inject(material)` để đăng ký uniform vào từng material. Khi survey toàn bộ 20 modules: **không có module nào thực sự gọi inject()**. Mỗi module tự khai báo `uniform(0)` cục bộ — v1 tồn tại nhưng không được dùng.

## Decision

Bỏ singleton + inject(). Thay bằng exported TSL `uniform()` nodes:

```typescript
export const uTime    = uniform(0)
export const uWeather = uniform(0)
export const uDamage  = uniform(0)
```

Module import trực tiếp, không cần registration ceremony. Cập nhật `.value` từ animation loop — NodeMaterial tự propagate.

## Alternatives đã cân nhắc

| Alternative | Lý do reject |
|---|---|
| Giữ singleton v1 | Dead code — không ai dùng inject() |
| timerGlobal() cho uTime | Chưa verify tồn tại trong 0.174; cần manual verification trước khi adopt |
| Event bus / pub-sub | Overhead không cần thiết cho 3 uniform |

## Consequences

- **Breaking change** — version bump 1.0.0 → 2.0.0
- Modules cần uTime cục bộ vẫn tự khai báo `uniform(0)` riêng — đây là đúng
- lint-shaders.js không bị ảnh hưởng (v2 không dùng ShaderMaterial)
