# procedural-brick-cracks — vết nứt/nẻ procedural trên BrickWall

> Đã thử & gỡ khỏi BrickWall (2026-05-29) — user thấy chưa đạt, hoãn để nghiên cứu lại.
> Revisit khi: có thời gian tune kỹ hoặc tìm được kỹ thuật nứt tốt hơn (Voronoi/distance-field).
> Concrete/Wood VẪN giữ crack (level-set fbm) vì nứt liền mạch hợp 2 chất liệu đó.

---

## Vì sao gỡ khỏi brick

User feedback khi thử trên gạch:
- "vết nứt trông như vết vẽ bậy bằng bút chì — liền mạch, dứt khoát, ngoằn ngoèo" → quá đều/nhân tạo.
- Cần: **đứt quãng nhiều hơn, ngắn hơn, rời theo từng ô gạch hơn, không sắc nét**.
- Màu nứt: **trùng tông tường nhưng đậm hơn** (KHÔNG phải đen).

→ Mottle (loang lổ) + bóng rãnh đáy gạch đã đủ "thật" cho brick. Crack thêm vào gây rối khi chưa tune đạt. Gỡ, giữ brick gọn.

## Kỹ thuật đã dùng (level-set fbm) — để tái dùng

```ts
// 1. Level-set: |fbm|→0 cho đường mảnh ngoằn ngoèo
const cn = mx_fractal_noise_float(positionWorld.mul(uCrackScale), int(4), float(2.3), float(0.5))
const line = float(1).sub(smoothstep(float(0), uCrackWidth, cn.abs()))

// 2. Breakup: noise tần số cao cắt line thành đoạn ngắn đứt quãng
const breakup = smoothstep(float(0.35), float(0.62),
  mx_fractal_noise_float(positionWorld.mul(uCrackScale.mul(2.5)), int(2), float(2.0), float(0.5))
    .mul(0.5).add(0.5))

// 3. brickMask: nhân _brickMask() → nứt TẮT ở mạch vữa, mỗi đoạn nằm gọn 1 viên ("rời từng ô")
// 4. cluster: noise tần số thấp → chỉ ~25% diện tích có nứt (thưa)
const crack = line.mul(breakup).mul(cluster).mul(_brickMask()).mul(uCrack)

// 5. Màu = tông tường ĐẬM HƠN (mix, không nhân về đen)
return mix(weathered, weathered.mul(0.4), crack)
```

## Vấn đề còn lại / hướng nghiên cứu

- **Level-set fbm cho đường quá "trơn", đều** → trông nhân tạo. Cần độ gãy khúc, rẽ nhánh tự nhiên hơn.
- **Hướng tốt hơn cần thử:**
  - **Voronoi crack** (cell edges của Voronoi) → đường gãy khúc, rẽ nhánh, giống nứt vật lý hơn level-set fbm trơn.
  - **Distance-to-nearest-feature-line** + threshold → kiểm soát độ dày/đứt tốt hơn.
  - Domain warp trước khi level-set → đường nứt ngoằn ngoèo bất quy tắc hơn.
- **Per-brick seeding**: hash cellU/cellV → quyết định viên nào có nứt + seed riêng cho mỗi viên (thay cluster noise global) → "rời từng ô" chuẩn hơn.
- Cân nhắc nứt nên đi kèm **bump âm** (normalNode) để có khe lõm thật, không chỉ vệt màu.

## Trạng thái uniforms (nếu khôi phục)

Brick từng có: `crack` (0.55), `crackScale` (3.0), `crackWidth` (0.05) + import `int`, `mx_fractal_noise_float`. Đã gỡ cả 3 uniform + options khỏi `BrickWall/index.ts`. Mottle (`mx_fractal_noise_float`) vẫn còn nên import giữ nguyên.
