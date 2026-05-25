# Deferred: IQ Techniques cho Building System

> Ghi lại để không mất — implement khi building system phức tạp hơn.
> Context: rasterization (Three.js MeshToon), không phải raymarching.

---

## Kỹ thuật nào của IQ áp dụng được cho rasterization?

IQ nổi tiếng với SDF + raymarching — nhưng nhiều kỹ thuật của ông là **math thuần**, không phụ thuộc vào rendering pipeline. Những cái đó áp dụng được thẳng vào Three.js.

---

## Tier 1 — Áp dụng ngay, không cần shader

### 1. Periodic window placement (mod-based)
Thay vì hardcode `positions: [[-2.2, 1.5], [2.2, 1.5]...]`,
IQ dùng modular arithmetic để đặt chi tiết theo chu kỳ:

```typescript
// Số cột / số tầng tính từ kích thước building
const cols = Math.floor(bodyW / WIN_SPACING)    // 7.0 / 2.4 = 2 cột
const floors = Math.floor(bodyH / FLOOR_HEIGHT) // 5.4 / 2.7 = 2 tầng

for (let f = 0; f < floors; f++) {
  for (let c = 0; c < cols; c++) {
    const x = (c - (cols-1)/2) * WIN_SPACING   // center cả dãy
    const y = 0.5 + f * FLOOR_HEIGHT + WIN_OFFSET_Y
    // → place window at (x, y)
  }
}
```

**Lợi ích:** Khi `bodyH` tăng (nhà 3-4 tầng) → windows tự scale, không cần sửa code.
Đây là nền tảng để support multi-story buildings sau này.

---

### 2. IQ Palette function cho màu tường

Thay vì mảng 6 màu cố định, IQ dùng:
```
color(t) = a + b·cos(2π·(c·t + d))
```
Với `a, b, c, d` là vec3 → cho ra gradient màu liên tục, aesthetically pleasing.

```typescript
function _iqPalette(t: number): THREE.Color {
  // Warm anime palette: kem → hồng → tím → xanh nhạt
  const a = [0.88, 0.82, 0.78]
  const b = [0.12, 0.10, 0.15]
  const c = [1.0,  1.0,  1.0 ]
  const d = [0.00, 0.15, 0.35]
  return new THREE.Color(
    a[0] + b[0] * Math.cos(6.283 * (c[0] * t + d[0])),
    a[1] + b[1] * Math.cos(6.283 * (c[1] * t + d[1])),
    a[2] + b[2] * Math.cos(6.283 * (c[2] * t + d[2]))
  )
}
// Dùng: color = _iqPalette(_rand(seed + 3))
```

**Lợi ích:** Vô hạn màu khác nhau, luôn aesthetically pleasing, không bao giờ clash.

---

### 3. Height variation qua fBm cho skyline

Thay vì chỉ có 2 chiều cao cố định (residential 5.4m, shop 3.2m), dùng fBm từ
Terrain.ts (`_fbm`) để xác định chiều cao từng building theo vị trí trong thành phố:

```typescript
// Khu trung tâm (gần origin) → cao hơn; ngoại ô → thấp hơn
// cityDensityAt(x, z) → [0, 1] từ fBm
const density = _fbm(x * 0.01, z * 0.01)
const floorCount = 1 + Math.floor(density * 4)  // 1–5 tầng
const bodyH = floorCount * 2.7
```

**Lợi ích:** Skyline có form tự nhiên thay vì flat uniform height. Cùng noise function
đã có → không cần thêm dependency.

---

## Tier 2 — Cần TSL shader

### 4. Procedural facade texture (TSL)

IQ hay làm worn concrete, brickwork bằng noise trên UV.
Trong TSL, có thể add vào `bodyMat.colorNode`:

```typescript
// Pseudo-code TSL
const brick = step(0.05, mod(positionLocal.xy * uBrickScale, vec2(1.0)))
const worn  = _fbm(positionWorld.xz * 0.5) * 0.15
colorNode = baseColor.mul(brick.r).add(worn)
```

**Khi implement:** Tạo module `threejs-modules/shaders/FacadeShader/`.

---

### 5. Domain warping cho tường cũ

IQ's domain warping: `texture(uv + noise(uv))` — tạo cảm giác tường bị phong hóa,
không thẳng tuyến tính. Kết hợp với TriplanarMapping (đã có trong threejs-modules).

**Khi implement:** Extend TriplanarMapping module với warp pass.

---

## Tier 3 — Kiến trúc lớn hơn (khi có 10+ building types)

### 6. SDF building bounds cho LOD/culling

Dù không raymarching, box SDF có thể dùng để:
- Tính khoảng cách camera → building (LOD switching)
- Frustum culling chính xác hơn BoundingBox
- Shadow LOD: gần = full geometry, xa = billboard

```typescript
// sdBox từ IQ: https://iquilezles.org/articles/distfunctions/
function sdBox(p: THREE.Vector3, b: THREE.Vector3): number {
  const q = p.clone().abs().sub(b)
  return Math.min(Math.max(q.x, q.y, q.z), 0) + 
         new THREE.Vector3(Math.max(q.x, 0), Math.max(q.y, 0), Math.max(q.z, 0)).length()
}
```

---

## Thứ tự implement đề xuất

```
Bây giờ:     Periodic windows (#1) — khi thêm multi-story
Tiếp theo:   IQ Palette (#2) — khi muốn màu sắc phong phú hơn
             Height via fBm (#3) — khi thêm skyline variation
Sau này:     Facade shader (#4) — khi có TSL pass
             Domain warping (#5) — visual polish late stage
             SDF bounds (#6) — khi có LOD system
```

---

## Tham khảo

- IQ Palette: https://iquilezles.org/articles/palettes/
- IQ Noise: https://iquilezles.org/articles/morenoise/ (đã port vào Terrain.ts)
- IQ SDF: https://iquilezles.org/articles/distfunctions/
- IQ City (shadertoy): https://www.shadertoy.com/view/XtsSWs
