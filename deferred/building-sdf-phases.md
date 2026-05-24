# Building SDF Phases — IQ Technical Reference

> Pipeline: BuildingLab render SDF ray march → verify mỹ thuật → bake → production asset
> Bake trước khi sản xuất hàng loạt — Lab là source of truth, không phải geometry BoxGeometry.
>
> Related: `building-iq-techniques.md` (tricks), `lab-base-template.md` (Lab infra)
> Source: https://iquilezles.org/articles/distfunctions/

---

## Nền tảng: Các hàm IQ primitive

> Mọi thứ bên dưới đều ghép từ 6 primitive + 4 operation này.
> **Coordinate convention:** Y = up. Object space — center tại origin.

```glsl
// ─── PRIMITIVES ───────────────────────────────────────────────────────────────

// Box — half-extents b
// b.x = half-width (X), b.y = half-height (Y), b.z = half-depth (Z)
// Kích thước thực: width=2*b.x, height=2*b.y, depth=2*b.z
float sdBox(vec3 p, vec3 b) {
  vec3 q = abs(p) - b;
  return length(max(q, 0.0)) + min(max(q.x, max(q.y, q.z)), 0.0);
}

// Rounded Box — như sdBox nhưng bevel góc bán kính r
// Constraint: r < min(b.x, b.y, b.z) — nếu không box sẽ "co lại"
float sdRoundBox(vec3 p, vec3 b, float r) {
  vec3 q = abs(p) - b + r;
  return length(max(q, 0.0)) + min(max(q.x, max(q.y, q.z)), 0.0) - r;
}

// Cylinder — aligned Y-axis
// r = radius, h = half-height
// Kích thước thực: diameter=2*r, height=2*h
float sdCylinder(vec3 p, float r, float h) {
  vec2 d = abs(vec2(length(p.xz), p.y)) - vec2(r, h);
  return min(max(d.x, d.y), 0.0) + length(max(d, 0.0));
}

// Capsule — segment AB + radius r (beam, pipe, railing)
// a, b = endpoints trong local space
// r = tube radius
float sdCapsule(vec3 p, vec3 a, vec3 b, float r) {
  vec3 pa = p - a, ba = b - a;
  float h = clamp(dot(pa, ba) / dot(ba, ba), 0.0, 1.0);
  return length(pa - ba * h) - r;
}

// Triangular Prism — gabled roof / hip dormer
// h.x = half-width của tam giác đáy (theo X)
// h.y = half-depth (theo Z, chiều dài mái)
// Đỉnh tam giác luôn hướng +Y, đáy tại y=0
float sdPrism(vec3 p, vec2 h) {
  vec3 q = abs(p);
  return max(q.z - h.y,
             max(q.x * 0.866 + p.y * 0.5, -p.y) - h.x * 0.5);
}

// Infinite Plane — mặt phẳng nằm ngang tại y=0 (foundation clip)
// n = normal (thường vec3(0,1,0)), h = offset
float sdPlane(vec3 p, vec3 n, float h) {
  return dot(p, n) + h;
}


// ─── OPERATIONS ───────────────────────────────────────────────────────────────

float opUnion(float d1, float d2) {
  return min(d1, d2);           // Hợp: giữ cả hai hình
}

float opSubtraction(float d1, float d2) {
  return max(-d1, d2);          // Khoét d1 ra khỏi d2 (d2=base, d1=hole)
}

float opIntersection(float d1, float d2) {
  return max(d1, d2);           // Giao: chỉ giữ phần chung
}

float opSmoothUnion(float d1, float d2, float k) {
  // k = smoothing radius. k=0 → giống opUnion. k=0.5 → blend rộng 0.5m
  float h = clamp(0.5 + 0.5 * (d2 - d1) / k, 0.0, 1.0);
  return mix(d2, d1, h) - k * h * (1.0 - h);
}

// Repeat vô hạn — dùng cho tile, panel, railing dày đặc
// c = period (spacing): vec3(bước_X, bước_Y, bước_Z)
// Tắt axis bằng cách để c.axis = rất lớn (1e10)
vec3 opRep(vec3 p, vec3 c) {
  return mod(p + 0.5 * c, c) - 0.5 * c;
}

// Repeat có giới hạn — N lần, không bị "tràn" ra ngoài domain
// c = spacing, l = số lần lặp mỗi chiều (±l → 2l+1 instances)
vec3 opRepLim(vec3 p, float c, vec3 l) {
  return p - c * clamp(round(p / c), -l, l);
}
```

---

## Phase 1 — Foundation & Structure

### `foundation` — Đế móng nhô mặt đất

```glsl
// Nguyên lý: box nhô cao hơn mặt sàn 0.3-0.5m, rộng hơn body ~0.2-0.4m mỗi chiều
// Bevel nhỏ r=0.02 để crease sắc (không quá tròn)
float sdFoundation(vec3 p, vec3 halfBody, float outset, float height, float bevel) {
  vec3 b = halfBody + vec3(outset, 0.0, outset);  // Nở rộng X/Z
  b.y = height * 0.5;                              // Cao foundation
  return sdRoundBox(p + vec3(0.0, height * 0.5, 0.0), b, bevel);
  //                   ↑ shift lên để đáy nằm tại y=0
}
```

| Parameter | Ý nghĩa | Range thực tế Nhật | Lab slider |
|---|---|---|---|
| `outset` | Nhô ra ngoài body mỗi cạnh | 0.1 – 0.4 m | 0.0 – 0.5 |
| `height` | Chiều cao phần móng lộ | 0.2 – 0.6 m | 0.1 – 0.8 |
| `bevel` | Bán kính góc cạnh | 0.01 – 0.04 m | 0.0 – 0.08 |

**Op recipe:** `opUnion(sdFoundation, sdBody)` — nối liền không gap.  
**Gotcha:** Nếu `bevel > outset` → foundation bị "co" bé hơn body → tăng outset hoặc giảm bevel.

---

### `column_round` — Cột tròn gỗ / bê tông

```glsl
// Cylinder thẳng + smooth blend vào sàn/trần
float sdColumnRound(vec3 p, float radius, float halfHeight) {
  return sdCylinder(p, radius, halfHeight);
}
// Blend với floor slab: opSmoothUnion(sdFloorSlab, sdColumnRound, k=0.05)
```

| Parameter | Ý nghĩa | Range Nhật | Lab slider |
|---|---|---|---|
| `radius` | Bán kính cột | 0.1 – 0.25 m | 0.05 – 0.35 |
| `halfHeight` | Nửa chiều cao | tầng_H / 2 | — (lock theo tầng) |
| `k` (smooth) | Blend với sàn | 0.03 – 0.08 | 0.0 – 0.15 |

**Ví dụ thực:** Nhà ở 1 tầng `radius=0.12`, văn phòng RC `radius=0.20`.  
**Typical position:** Góc building hoặc portiko hiên trước.

---

### `column_square` — Cột vuông bê tông cốt thép

```glsl
// RoundBox với bevel nhỏ — cột RC không tròn hoàn toàn, góc hơi bo
float sdColumnSquare(vec3 p, float side, float halfHeight, float bevel) {
  vec3 b = vec3(side * 0.5, halfHeight, side * 0.5);
  return sdRoundBox(p, b, bevel);
}
```

| Parameter | Ý nghĩa | Range Nhật | Lab slider |
|---|---|---|---|
| `side` | Cạnh cột (vuông) | 0.2 – 0.45 m | 0.1 – 0.6 |
| `halfHeight` | Nửa chiều cao tầng | — | lock |
| `bevel` | Chamfer góc | 0.01 – 0.03 | 0.0 – 0.06 |

**Gotcha:** `bevel` không được > `side * 0.5 - 0.01` — kiểm tra runtime.  
**Assembly:** Thường đặt theo `opRepLim` với spacing = grid cột (3.0–4.5m).

---

### `beam_horizontal` — Xà ngang nối cột

```glsl
// Capsule từ điểm A đến B với radius = nửa section beam
// Dùng capsule thay box vì handles giao cắt tự nhiên hơn tại joint
float sdBeam(vec3 p, vec3 a, vec3 b, float radius) {
  return sdCapsule(p, a, b, radius);
}
// Rectangular beam: dùng sdBox xoay thay capsule nếu cần tiết diện vuông chính xác
// Xoay: transform p vào local space của beam trước khi gọi sdBox
```

| Parameter | Ý nghĩa | Range | Lab slider |
|---|---|---|---|
| `a`, `b` | 2 endpoint trong world | vị trí cột | — |
| `radius` | Nửa section beam | 0.06 – 0.15 m | 0.03 – 0.25 |

**Rectangular section (chính xác hơn):**
```glsl
// Xà tiết diện chữ nhật — transform p vào axis beam, rồi sdBox
vec3 beamDir = normalize(b - a);
float t      = dot(p - a, beamDir);           // projection
vec3  closest = a + beamDir * clamp(t, 0.0, length(b - a));
vec3  local  = p - closest;                   // distance từ beam axis
// Rotate local về canonical axis rồi sdBox(local, vec3(w,h, length/2))
```

**Op recipe:** `opSmoothUnion(sdBeam, sdColumn, k=0.04)` → joint tự nhiên.

---

### `floor_slab_edge` — Gờ sàn tầng (floor band)

```glsl
// Box mỏng nằm ngang, nhô ra ngoài wall ~0.05-0.10m, mỗi tầng 1 cái
// Tạo horizontal shadow band — đặc trưng mansion/apartment modern
float sdFloorBand(vec3 p, vec3 halfBody, float bandH, float outset, float yPos) {
  vec3 b = vec3(halfBody.x + outset, bandH * 0.5, halfBody.z + outset);
  return sdBox(p - vec3(0.0, yPos, 0.0), b);
}
```

| Parameter | Ý nghĩa | Range | Lab slider |
|---|---|---|---|
| `bandH` | Chiều cao band | 0.05 – 0.15 m | 0.03 – 0.20 |
| `outset` | Nhô ra ngoài wall | 0.03 – 0.12 m | 0.0 – 0.20 |
| `yPos` | Y của mỗi tầng | floorH * i | — |

**Assembly:** Lặp qua số tầng bằng `opRepLim` trên trục Y:
```glsl
vec3 q = opRepLim(p, floorH, vec3(0.0, float(numFloors/2), 0.0));
float d = sdFloorBand(q, ...);
```

---

## Phase 2 — Walls

### `wall_flat` — Tường đơn

```glsl
// Box cơ bản — body của building
// halfBody = vec3(W/2, H/2, D/2)
float sdWallFlat(vec3 p, vec3 halfBody) {
  return sdBox(p, halfBody);
}
```

| Parameter | Ý nghĩa | Typical | Note |
|---|---|---|---|
| `halfBody` | Half-extents building | từ TOKENS | Không slider — lock theo token |

**Không có gì đặc biệt** — đây là base shape. Mọi thứ khác đều khoét vào hoặc thêm lên trên.

---

### `wall_reveal` — Rãnh shadow line ngang tầng

```glsl
// Khoét 1 rãnh nằm ngang per tầng — tạo shadow line tự nhiên
// Không cần normal map — SDF tự cho depth
float sdWallReveal(vec3 p, vec3 halfBody, float revealW, float revealD, float yPos) {
  // Rãnh: box mỏng nằm ngang, âm vào wall
  vec3 cutB = vec3(halfBody.x + 0.01, revealW * 0.5, revealD * 0.5);
  float cut = sdBox(p - vec3(0.0, yPos, halfBody.z - revealD * 0.5), cutB);
  float wall = sdBox(p, halfBody);
  return opSubtraction(cut, wall);  // khoét "cut" ra khỏi "wall"
}
```

| Parameter | Ý nghĩa | Range | Lab slider |
|---|---|---|---|
| `revealW` | Chiều cao rãnh | 0.02 – 0.08 m | 0.01 – 0.12 |
| `revealD` | Sâu vào tường | 0.02 – 0.06 m | 0.01 – 0.10 |
| `yPos` | Y vị trí mỗi tầng | floorH * i | — |

**Visual:** Rãnh 3cm × 3cm ở mỗi sàn tầng → shadow line sắc gọn, không cần texture.  
**Gotcha:** `opSubtraction(cut, wall)` — d1=cut, d2=wall. Nhầm thứ tự → kết quả ngược.

---

### `wall_panel` — Curtain wall panel grid

```glsl
// Grid tấm panel — dùng opRep để lặp
// Mỗi panel = sdBox lớn, khoét groove ở viền bằng opSubtraction
float sdWallPanel(vec3 p, float panelW, float panelH, float grooveW, float grooveD, vec3 halfBody) {
  // Repeat p theo grid
  vec2 cellSize  = vec2(panelW, panelH);
  vec3 q = p;
  q.xy = mod(p.xy + 0.5 * cellSize, cellSize) - 0.5 * cellSize;

  // Panel = toàn bộ cell
  float panel = sdBox(q, vec3(panelW * 0.5, panelH * 0.5, halfBody.z));

  // Groove viền panel — cross-shaped cut
  float gH = sdBox(q, vec3(panelW * 0.5,  grooveW * 0.5, grooveD));
  float gV = sdBox(q, vec3(grooveW * 0.5, panelH * 0.5,  grooveD));
  float groove = min(gH, gV);

  return opSubtraction(groove, panel);
}
```

| Parameter | Ý nghĩa | Range | Lab slider |
|---|---|---|---|
| `panelW` | Rộng mỗi panel | 0.8 – 1.5 m | 0.5 – 2.0 |
| `panelH` | Cao mỗi panel | 0.6 – 1.2 m | 0.4 – 1.6 |
| `grooveW` | Rộng rãnh viền | 0.02 – 0.06 m | 0.01 – 0.10 |
| `grooveD` | Sâu rãnh | 0.02 – 0.05 m | 0.01 – 0.08 |

**Dùng cho:** Office curtain wall, mansion façade, pre-fab apartment.

---

### `parapet` — Gờ lan can mái phẳng

```glsl
// Box mỏng trên đỉnh mái phẳng — che HVAC equipment
float sdParapet(vec3 p, vec3 halfBody, float parapetH, float thickness) {
  // 4 mặt xung quanh (không có mặt trên/dưới — rỗng ở giữa)
  float outerH = parapetH * 0.5;
  float outer = sdBox(p - vec3(0.0, outerH, 0.0),
                      vec3(halfBody.x + thickness, outerH, halfBody.z + thickness));
  float inner = sdBox(p - vec3(0.0, outerH, 0.0),
                      vec3(halfBody.x,              outerH + 0.01, halfBody.z));
  return opSubtraction(inner, outer);  // hollow box
}
```

| Parameter | Ý nghĩa | Range | Lab slider |
|---|---|---|---|
| `parapetH` | Chiều cao gờ | 0.4 – 1.2 m | 0.2 – 1.5 |
| `thickness` | Dày gờ | 0.10 – 0.25 m | 0.05 – 0.35 |

**Token mapping:** `PARAPET_DIM = { h: 0.6, t: 0.15 }`.  
**Dùng khi:** `roofH ≤ 1.0` (flat roof convention).

---

## Phase 3 — Roofs

### `gabled` — Mái đầu hồi (kirizuma 切妻)

```glsl
// sdPrism với đỉnh chạy theo trục X
// Đặt lên trên body: y offset = bodyH + prism_origin
float sdGabledRoof(vec3 p, float halfSpan, float halfDepth, float ridgeH, float eaveOutset) {
  // halfSpan: nửa rộng building (X) + eave outset
  // halfDepth: nửa sâu building (Z) + eave outset
  // ridgeH: chiều cao đỉnh mái từ đường eave
  vec2 h = vec2(halfSpan + eaveOutset, halfDepth + eaveOutset);

  // sdPrism — tam giác theo XY, depth theo Z
  // Cần scale Y để đỉnh đúng chiều cao
  // IQ sdPrism có góc cố định 60°, cần điều chỉnh
  // Tốt hơn: dùng sdBox xoay 2 mặt dốc + opUnion
  float leftSlope  = sdBox(p - vec3(-(halfSpan * 0.5 + eaveOutset * 0.5), ridgeH * 0.5, 0.0),
    vec3(halfSpan * 0.6, ridgeH * 0.6, halfDepth + eaveOutset)); // approximate
  // → Chính xác hơn dùng custom prism với arbitrary slope
  return sdPrism(p, h); // baseline — tune slope bằng scale p.y trước khi gọi
}

// Cách chính xác hơn: stretch Y trước gọi sdPrism
// roofAngle degrees → tan(angle) = ridgeH / halfSpan
// p_scaled = vec3(p.x, p.y * (halfSpan / ridgeH), p.z)  ← scale để sdPrism khớp góc
float sdGabledRoofExact(vec3 p, float halfSpan, float halfDepth, float ridgeH, float eaveOutset) {
  float scaleY = halfSpan / ridgeH;                  // map sang không gian equilateral
  vec3  ps     = vec3(p.x, p.y * scaleY, p.z);
  float d      = sdPrism(ps, vec2(halfSpan + eaveOutset, halfDepth + eaveOutset));
  return d / scaleY;                                  // unscale distance về world space
  // Lưu ý: cần chia gradient nếu dùng cho ray march normal estimation
}
```

| Parameter | Ý nghĩa | Range Nhật | Lab slider |
|---|---|---|---|
| `halfSpan` | Nửa rộng body X | từ token W/2 | lock |
| `halfDepth` | Nửa sâu body Z | từ token D/2 | lock |
| `ridgeH` | Cao đỉnh mái | 1.5 – 3.0 m | 0.5 – 4.0 |
| `eaveOutset` | Nhô mái ra ngoài | 0.3 – 0.8 m | 0.0 – 1.2 |

**Slope calculation:** `angle = atan(ridgeH / halfSpan)`. Nhật truyền thống ~30–45°.  
**Gotcha:** `sdPrism` giả định tam giác đều 60°. Dùng `sdGabledRoofExact` với Y-scale để có bất kỳ góc nào.

---

### `hip` — Mái thái (yosemune 寄棟)

```glsl
// 4 mặt dốc hội tụ về 1 đường ridge ngắn (hoặc 1 điểm — pyramid)
// Kỹ thuật: intersection của 4 half-space dốc
float sdHipRoof(vec3 p, float halfW, float halfD, float ridgeH, float ridgeLen, float eaveOut) {
  float eW = halfW + eaveOut;
  float eD = halfD + eaveOut;

  // 4 mặt phẳng dốc, normal hướng vào trong
  // Dốc trước/sau (theo Z): slope = ridgeH / eD
  float slopeZ = ridgeH / eD;
  float frontBack = abs(p.z) * slopeZ - p.y;   // < 0 = bên trong mặt dốc

  // Dốc trái/phải (theo X): slope = ridgeH / eW, chỉ áp dụng ngoài ridge
  float slopeX = ridgeH / eW;
  float leftRight = (abs(p.x) - ridgeLen) * slopeX - p.y;

  // Hip = intersection của 4 mặt dốc + clamp Y
  float d = max(max(frontBack, leftRight), -p.y); // -p.y = clip phía dưới eave
  return d;
  // Note: đây là approximation bằng half-space, không phải SDF chính xác
  // Đủ cho ray march preview, cần post-process cho bake mesh
}
```

| Parameter | Ý nghĩa | Range | Lab slider |
|---|---|---|---|
| `ridgeH` | Chiều cao mái | 1.5 – 2.5 m | 0.5 – 3.5 |
| `ridgeLen` | Nửa dài ridge | 0 – halfW*0.5 | 0.0 – halfW |
| `eaveOut` | Nhô eave | 0.3 – 0.7 m | 0.0 – 1.0 |

**ridgeLen=0** → pyramid (irimoya style). **ridgeLen=halfW** → degenerate = gabled.

---

### `flat` — Mái bằng + parapet

```glsl
// Đơn giản nhất: body box extend thêm roofH, parapet ở trên
// roofH ≤ 1.0 theo convention = flat (không phải gabled)
float sdFlatRoof(vec3 p, vec3 halfBody, float roofH) {
  // Slab mái: box full-width, dày roofH
  vec3 b = vec3(halfBody.x, roofH * 0.5, halfBody.z);
  return sdBox(p - vec3(0.0, halfBody.y + roofH * 0.5, 0.0), b);
  // Thêm parapet: xem Phase 2 sdParapet, gọi opUnion sau
}
```

**Convention:** `roofH ≤ 1.0` trong TOKENS = signal flat roof + parapet. Không cần slider riêng.

---

### `shed` — Mái 1 chiều (warehouse, lean-to)

```glsl
// Box được shear theo 1 trục — 1 phía thấp, 1 phía cao
// Kỹ thuật: shear transform trên p trước khi gọi sdBox
float sdShedRoof(vec3 p, float halfW, float halfD, float lowH, float highH, float eaveOut) {
  // Chiều cao trung bình và delta
  float midH   = (lowH + highH) * 0.5;
  float deltaH = (highH - lowH) * 0.5;

  // Shear p.y theo p.z → tạo dốc 1 chiều
  float slope = deltaH / halfD;
  vec3  pShear = vec3(p.x, p.y - p.z * slope, p.z); // shear trong YZ plane

  return sdBox(pShear, vec3(halfW + eaveOut, midH, halfD + eaveOut));
}
```

| Parameter | Ý nghĩa | Range | Lab slider |
|---|---|---|---|
| `lowH` | Chiều cao mái phía thấp | 0.3 – 1.0 m | 0.1 – 1.5 |
| `highH` | Chiều cao phía cao | 1.0 – 2.5 m | 0.5 – 3.0 |
| `eaveOut` | Nhô eave | 0.2 – 0.6 m | 0.0 – 1.0 |

**Slope angle:** `atan(highH - lowH, depth)`. Warehouse Nhật thường 5°–15°.

---

### `eave` — Mái hiên nhô ra (đặc trưng nhà Nhật)

```glsl
// Box mỏng nằm ngang, nhô xa khỏi tường — che mưa
// Thường đặt ngay trên cửa sổ hoặc dọc theo tường
float sdEave(vec3 p, float halfW, float depth, float thickness, float yPos) {
  vec3 b = vec3(halfW, thickness * 0.5, depth * 0.5);
  // Đặt sát mặt ngoài tường, nhô ra phía trước (trục Z âm)
  return sdBox(p - vec3(0.0, yPos, -(halfW * 0.0 + depth * 0.5)), b);
  // halfW_wall là khoảng cách từ tâm đến mặt tường
}
```

| Parameter | Ý nghĩa | Range | Lab slider |
|---|---|---|---|
| `depth` | Độ nhô eave | 0.4 – 1.5 m | 0.2 – 2.0 |
| `thickness` | Dày eave | 0.05 – 0.20 m | 0.03 – 0.30 |
| `yPos` | Độ cao (trên cửa sổ) | tùy | slide per tầng |

---

## Phase 4 — Openings

### `door_frame` — Khung cửa đi

```glsl
// Khoét lỗ cửa vào tường, thêm frame depth
float sdDoorOpening(vec3 p, vec3 halfWall, float doorW, float doorH, float depth,
                    float frameT, float xOffset, float wallZ) {
  // Lỗ cửa trong tường
  vec3 holeB = vec3(doorW * 0.5, doorH * 0.5, halfWall.z + 0.01);
  float hole = sdBox(p - vec3(xOffset, doorH * 0.5, wallZ), holeB);

  // Frame bên ngoài lỗ (3 cạnh — không có ngưỡng trên nếu flush)
  vec3 outerB = vec3(doorW * 0.5 + frameT, doorH * 0.5 + frameT, depth * 0.5);
  vec3 innerB = vec3(doorW * 0.5,          doorH * 0.5,          depth * 0.5 + 0.01);
  float outerFrame = sdBox(p - vec3(xOffset, doorH * 0.5, wallZ), outerB);
  float innerFrame = sdBox(p - vec3(xOffset, doorH * 0.5, wallZ), innerB);
  float frame = opSubtraction(innerFrame, outerFrame); // hollow frame

  // Kết hợp: wall - hole, rồi + frame
  float wall = sdBox(p, halfWall);
  float wallWithHole = opSubtraction(hole, wall);
  return opUnion(wallWithHole, frame);
}
```

| Parameter | Ý nghĩa | Range Nhật | Lab slider |
|---|---|---|---|
| `doorW` | Rộng cửa | 0.8 – 1.2 m | 0.6 – 1.8 |
| `doorH` | Cao cửa | 1.9 – 2.1 m | 1.6 – 2.4 |
| `depth` | Sâu khung (depth reveal) | 0.05 – 0.15 m | 0.02 – 0.25 |
| `frameT` | Dày khung | 0.05 – 0.10 m | 0.02 – 0.15 |
| `xOffset` | Vị trí X | tùy layout | slide |

---

### `window_frame` — Cửa sổ đơn

```glsl
// Tương tự door nhưng bev góc nhẹ, float trên tường (không chạm sàn)
float sdWindowFrame(vec3 p, vec3 halfWall, float winW, float winH, float depth,
                    float frameT, float bevel, vec3 offset) {
  // Lỗ window
  vec3 holeB = vec3(winW * 0.5, winH * 0.5, halfWall.z + 0.01);
  float hole = sdBox(p - offset, holeB);

  // Frame (RoundBox cho bevel góc nhẹ)
  vec3 outerB = vec3(winW * 0.5 + frameT, winH * 0.5 + frameT, depth * 0.5);
  vec3 innerB = vec3(winW * 0.5,           winH * 0.5,           depth * 0.5 + 0.01);
  float outer = sdRoundBox(p - offset, outerB, bevel);
  float inner = sdBox(p - offset, innerB);
  float frame = opSubtraction(inner, outer);

  float wall = sdBox(p, halfWall);
  return opUnion(opSubtraction(hole, wall), frame);
}
```

| Parameter | Ý nghĩa | Range Nhật | Lab slider |
|---|---|---|---|
| `winW` | Rộng cửa sổ | 0.6 – 1.8 m | 0.4 – 2.4 |
| `winH` | Cao cửa sổ | 0.8 – 1.4 m | 0.5 – 1.8 |
| `depth` | Depth reveal | 0.08 – 0.15 m | 0.03 – 0.25 |
| `frameT` | Dày khung | 0.04 – 0.08 m | 0.02 – 0.12 |
| `bevel` | Bevel góc khung | 0.01 – 0.03 m | 0.0 – 0.05 |

---

### `window_grid` — Cửa sổ lưới (nhiều ô)

```glsl
// opRep để lặp cửa sổ theo hàng ngang + dọc
float sdWindowGrid(vec3 p, vec3 halfWall, float winW, float winH,
                   float spacingX, float spacingY, vec2 gridLL, float depth, float frameT) {
  // gridLL = lower-left của grid (offset từ center)
  // Lặp theo X và Y
  vec3 q = p;
  q.x = mod(p.x - gridLL.x + spacingX * 0.5, spacingX) - spacingX * 0.5 + gridLL.x;
  q.y = mod(p.y - gridLL.y + spacingY * 0.5, spacingY) - spacingY * 0.5 + gridLL.y;
  // Sau đó gọi sdWindowFrame(q, ...) như single window
  return sdWindowFrame(q, halfWall, winW, winH, depth, frameT, 0.01, vec3(0.0));
}
```

| Parameter | Ý nghĩa | Range | Lab slider |
|---|---|---|---|
| `spacingX` | Khoảng cách cửa sổ X | 1.2 – 2.4 m | 0.8 – 3.0 |
| `spacingY` | Khoảng cách theo tầng | floorH | lock |
| `winW`, `winH` | Kích thước 1 ô | xem bảng trên | — |

---

### `window_office_strip` — Dải kính văn phòng

```glsl
// Box nằm ngang full-width per tầng — kiểu office Japan
float sdOfficeWindowStrip(vec3 p, vec3 halfWall, float stripH, float depth, float frameT,
                          float sillH, float yCenter) {
  // Lỗ dải kính
  vec3 holeB = vec3(halfWall.x - frameT, stripH * 0.5, halfWall.z + 0.01);
  float hole = sdBox(p - vec3(0.0, yCenter, 0.0), holeB);

  // Sill (ngưỡng) phía dưới dải
  vec3 sillB = vec3(halfWall.x, sillH * 0.5, depth * 0.5);
  float sill = sdBox(p - vec3(0.0, yCenter - stripH * 0.5 - sillH * 0.5, halfWall.z - depth * 0.5), sillB);

  float wall = sdBox(p, halfWall);
  return opUnion(opSubtraction(hole, wall), sill);
}
```

| Parameter | Ý nghĩa | Range | Lab slider |
|---|---|---|---|
| `stripH` | Cao dải kính | 1.2 – 2.0 m | 0.8 – 2.4 |
| `depth` | Reveal sâu vào | 0.10 – 0.20 m | 0.05 – 0.30 |
| `sillH` | Cao ngưỡng sill | 0.08 – 0.20 m | 0.03 – 0.30 |

---

### `loading_door` — Cửa cuốn kho

```glsl
// Box lớn khoét vào tường, + horizontal tracks bằng opRep sdBox mỏng
float sdLoadingDoor(vec3 p, vec3 halfWall, float ldW, float ldH, float trackH, float trackSpacing) {
  // Lỗ cửa cuốn
  vec3 holeB = vec3(ldW * 0.5, ldH * 0.5, halfWall.z + 0.01);
  float hole = sdBox(p - vec3(0.0, ldH * 0.5, 0.0), holeB);

  // Horizontal tracks: opRep trong lỗ
  vec3 q = vec3(p.x, mod(p.y + trackSpacing * 0.5, trackSpacing) - trackSpacing * 0.5, p.z);
  vec3 trackB = vec3(ldW * 0.5 - 0.02, trackH * 0.5, 0.02);
  float tracks = sdBox(q, trackB);
  // Clip tracks chỉ trong lỗ cửa bằng opIntersection
  float tracksMasked = opIntersection(tracks, hole);

  float wall = sdBox(p, halfWall);
  return opUnion(opSubtraction(hole, wall), tracksMasked);
}
```

| Parameter | Ý nghĩa | Range Nhật | Lab slider |
|---|---|---|---|
| `ldW` | Rộng cửa | 2.4 – 4.5 m | 1.8 – 6.0 |
| `ldH` | Cao cửa | 2.4 – 3.6 m | 2.0 – 4.5 |
| `trackH` | Cao mỗi track | 0.06 – 0.12 m | 0.03 – 0.18 |
| `trackSpacing` | Khoảng cách track | 0.12 – 0.20 m | 0.08 – 0.25 |

---

## Phase 5 — Attachments

### `balcony_slab` — Sàn ban công

```glsl
// Box nằm ngang nhô ra ngoài tường
// Thường có gờ mỏng dưới sàn (drip edge) để thoát nước
float sdBalconySlab(vec3 p, float halfW, float depth, float slabH, float dripH, float dripT,
                    float yPos, float wallZ) {
  // Sàn slab
  vec3 slabB = vec3(halfW, slabH * 0.5, depth * 0.5);
  float slab = sdBox(p - vec3(0.0, yPos, wallZ + depth * 0.5), slabB);

  // Drip edge: gờ nhô xuống ở mép ngoài
  vec3 dripB = vec3(halfW, dripH * 0.5, dripT * 0.5);
  float drip = sdBox(p - vec3(0.0, yPos - slabH * 0.5 - dripH * 0.5, wallZ + depth - dripT * 0.5), dripB);

  return opUnion(slab, drip);
}
```

| Parameter | Ý nghĩa | Range | Lab slider |
|---|---|---|---|
| `depth` | Chiều sâu ban công | 0.8 – 1.5 m | 0.4 – 2.0 |
| `slabH` | Dày sàn | 0.10 – 0.18 m | 0.06 – 0.25 |
| `dripH` | Cao drip edge | 0.04 – 0.10 m | 0.0 – 0.15 |
| `dripT` | Dày drip | 0.02 – 0.04 m | 0.01 – 0.06 |

---

### `balcony_railing` — Lan can ban công

```glsl
// Thanh đứng: opRepLim(sdCylinder) theo X
// Thanh nằm: sdCapsule trên + dưới
float sdBalconyRailing(vec3 p, float halfW, float railH, float postR,
                       float postSpacing, float railR, float yBase, float depth, float wallZ) {
  // Posts (cột lan can)
  float postsX = (abs(p.x) < halfW - postSpacing * 0.5) ? 1.0 : 0.0; // crude domain check
  vec3 qPost = p;
  qPost.x = mod(p.x + halfW + postSpacing * 0.5, postSpacing) - postSpacing * 0.5 - halfW; // center grid
  qPost = opRepLim(p, postSpacing, vec3(floor(halfW / postSpacing), 0.0, 0.0));
  float post = sdCylinder(qPost - vec3(0.0, yBase + railH * 0.5, wallZ + depth - postR),
                           postR, railH * 0.5);

  // Top rail (nằm ngang)
  float topRail = sdCapsule(p,
    vec3(-halfW, yBase + railH, wallZ + depth - postR),
    vec3( halfW, yBase + railH, wallZ + depth - postR),
    railR);

  // Bottom rail
  float botRail = sdCapsule(p,
    vec3(-halfW, yBase + 0.05, wallZ + depth - postR),
    vec3( halfW, yBase + 0.05, wallZ + depth - postR),
    railR);

  return opUnion(opUnion(post, topRail), botRail);
}
```

| Parameter | Ý nghĩa | Range | Lab slider |
|---|---|---|---|
| `railH` | Chiều cao lan can | 0.9 – 1.1 m | 0.7 – 1.3 |
| `postR` | Bán kính cột đứng | 0.015 – 0.025 m | 0.01 – 0.04 |
| `postSpacing` | Khoảng cách cột | 0.1 – 0.15 m | 0.06 – 0.20 |
| `railR` | Bán kính thanh nằm | 0.015 – 0.020 m | 0.008 – 0.03 |

---

### `awning` — Mái hiên cửa hàng

```glsl
// Box xoay 10–20° theo trục X — mái nghiêng che nắng/mưa
float sdAwning(vec3 p, float halfW, float depth, float thickness, float angle, float yPos, float wallZ) {
  // Xoay p ngược angle để sdBox thẳng trở lại
  float cosA = cos(-angle), sinA = sin(-angle);
  vec3 q = p - vec3(0.0, yPos, wallZ);
  q.yz = vec2(q.y * cosA - q.z * sinA,
              q.y * sinA + q.z * cosA);
  // Awning gắn vào wall, nhô ra depth theo Z
  return sdBox(q - vec3(0.0, 0.0, depth * 0.5), vec3(halfW, thickness * 0.5, depth * 0.5));
}
```

| Parameter | Ý nghĩa | Range | Lab slider |
|---|---|---|---|
| `depth` | Nhô ra ngoài | 0.5 – 1.5 m | 0.3 – 2.0 |
| `thickness` | Dày awning | 0.03 – 0.08 m | 0.01 – 0.15 |
| `angle` | Góc nghiêng (rad) | 0.15 – 0.35 | 0.0 – 0.6 |

**Dùng cho:** Convenience store, shop, chân tòa nhà tầng 1.

---

### `drain_pipe` — Ống thoát nước đứng (đặc trưng Nhật)

```glsl
// Cylinder mỏng chạy thẳng đứng từ mái xuống mặt đất
// Thường offset khỏi tường vài cm, gắn bằng bracket ẩn
float sdDrainPipe(vec3 p, float radius, float halfH, float wallOffsetX, float wallZ) {
  // Đứng theo Y, gắn sát mặt tường ngoài
  return sdCylinder(p - vec3(wallOffsetX, 0.0, wallZ + radius + 0.02), radius, halfH);
}

// Bracket giữ ống: sdCapsule nằm ngang từ tường đến ống, mỗi 1.5–2.0m
float sdPipeBracket(vec3 p, float wallZ, float pipeX, float pipeZ, float yPos) {
  return sdCapsule(p,
    vec3(pipeX, yPos, wallZ),
    vec3(pipeX, yPos, pipeZ),
    0.008);  // bracket rất mỏng
}
```

| Parameter | Ý nghĩa | Range | Lab slider |
|---|---|---|---|
| `radius` | Bán kính ống | 0.04 – 0.08 m | 0.02 – 0.12 |
| `halfH` | Nửa chiều cao ống | buildingH/2 | lock |
| `wallOffsetX` | Vị trí X (góc building) | ±(halfW-0.1) | pick |

**Thường có 2–4 ống** per building. Đặt ở góc và giữa mặt dài.  
**Nhật đặc trưng:** ống màu trắng hoặc xám, bracket sắt mỗi 1.5m.

---

### `ac_unit` — Điều hòa ngoài trời

```glsl
// RoundBox tỉ lệ 2:1:1, có grill (sdBox lặp theo opRep) trên mặt trước
float sdACUnit(vec3 p, vec3 dims, float bevel, vec3 pos, float grillSpacing, float grillH) {
  vec3 q = p - pos;
  // Thân hộp
  float body = sdRoundBox(q, dims * 0.5, bevel);

  // Grill — thanh ngang opRep trên mặt trước
  vec3 qg = q;
  qg.y = mod(q.y + grillSpacing * 0.5, grillSpacing) - grillSpacing * 0.5;
  vec3 grillB = vec3(dims.x * 0.5 - 0.01, grillH * 0.5, 0.02);
  float grill = sdBox(qg - vec3(0.0, 0.0, dims.z * 0.5 - 0.01), grillB);

  // Grill chỉ hiện trên mặt trước → dùng opIntersection với half-space
  float frontFace = sdBox(q, vec3(dims.x * 0.5, dims.y * 0.5, 0.02)); // thin slab front
  float grillMasked = opIntersection(grill, body);

  return opUnion(body, grillMasked);
}
```

| Parameter | Ý nghĩa | Range | Lab slider |
|---|---|---|---|
| `dims` | W × H × D | (0.8,0.6,0.25) | W:0.4–1.2, H:0.3–0.8 |
| `bevel` | Góc bo | 0.02 – 0.05 m | 0.01 – 0.08 |
| `grillSpacing` | Khoảng cách thanh grill | 0.03 – 0.06 m | 0.02 – 0.08 |

**Position:** Thường gắn tường bên, cách sàn 1.8–2.2m, cantilever ra ngoài 0.1–0.15m.

---

### `meter_box` — Hộp điện/gas

```glsl
// Flat box sát tường, depth rất mỏng so với width/height
float sdMeterBox(vec3 p, float w, float h, float d, float bevel, vec3 pos) {
  return sdRoundBox(p - pos, vec3(w*0.5, h*0.5, d*0.5), bevel);
}
```

| Parameter | Range | Notes |
|---|---|---|
| W × H × D | (0.35, 0.45, 0.12) | Hộp điện cơ bản Nhật |
| `bevel` | 0.01 – 0.02 | Nhỏ thôi — hộp kim loại góc sắc |

---

### `antenna` — Ăng-ten TV

```glsl
// Vertical mast + horizontal elements bằng sdCapsule
// Mast: sdCylinder nhỏ trên nóc nhà
float sdAntennaMast(vec3 p, float r, float halfH, vec3 pos) {
  return sdCylinder(p - pos, r, halfH);
}

// Element nằm ngang (dãy yagi)
float sdAntennaElement(vec3 p, float l, float r, float yPos, float zPos) {
  return sdCapsule(p,
    vec3(-l * 0.5, yPos, zPos),
    vec3( l * 0.5, yPos, zPos),
    r);
}
```

| Parameter | Range | Notes |
|---|---|---|
| Mast radius | 0.01 – 0.02 m | Rất mỏng |
| Element length | 0.2 – 0.5 m | Giảm dần từ dưới lên |
| Số elements | 5 – 10 | Yagi 8 elements: classical |

---

## Op Composition Patterns

### Pattern 1: Khoét cửa sổ trong vòng lặp

```glsl
float building = sdBox(p, halfBody);

// Khoét N cửa sổ theo grid
for (int i = 0; i < numWindows; i++) {
  vec3 winPos = vec3(winOffsets[i], winY, halfBody.z);
  float hole  = sdBox(p - winPos, vec3(winW*0.5, winH*0.5, halfBody.z + 0.01));
  building    = opSubtraction(hole, building);
}
```

### Pattern 2: SmoothUnion chain nhiều chi tiết

```glsl
float d = sdBody;
d = opSmoothUnion(d, sdColumn_L,  0.05);  // cột trái
d = opSmoothUnion(d, sdColumn_R,  0.05);  // cột phải
d = opSmoothUnion(d, sdBeam,      0.04);  // xà ngang
d = opUnion(d, sdRoof);                   // mái — không smooth (crease sắc)
d = opUnion(d, sdParapet);
d = opUnion(d, sdDrainPipe_L);
d = opUnion(d, sdDrainPipe_R);
d = opUnion(d, sdACUnit);
```

### Pattern 3: opSubtraction thứ tự đúng

```glsl
// Đúng: khoét HOLE ra khỏi WALL
float result = opSubtraction(hole, wall);  // d1=hole, d2=wall

// SAI: khoét wall ra khỏi hole → cho kết quả ngược
float wrong  = opSubtraction(wall, hole);  // ← ĐỪNG làm thế này
```

### Pattern 4: RepLim cho finite grid

```glsl
// N = 3 cột (indices -1, 0, +1)
vec3 qCol = opRepLim(p, 3.0 /*spacing*/, vec3(1.0, 0.0, 0.0) /*±1 lần theo X*/);
float col = sdCylinder(qCol - vec3(0.0, floorH*0.5, 0.0), 0.15, floorH*0.5);
```

---

## SDF Parameter Constraints — Kiểm tra trước khi render

```
sdRoundBox:  bevel < min(b.x, b.y, b.z)          → nếu không box "thu nhỏ"
sdCylinder:  h > 0, r > 0                         → h=0 → degenerate disk
sdPrism:     h.x > 0, h.y > 0                     → không có negative size
opRep:       c.x, c.y, c.z > 0.001                → c=0 gây NaN trong mod()
opRepLim:    l >= 0 mỗi chiều                      → l âm = undefined behavior
smoothUnion: k > 0                                 → k=0 gây chia zero trong clamp
scaleY trick (gabled): ridgeH > 0.001             → chia zero nếu ridgeH=0
```

---

## Bake Strategy

```
Mesh bake:    marchingCubes(sdf, resolution) → BufferGeometry → GLB
Texture bake: render SDF shader → RenderTarget → readPixels() → PNG
Normal bake:  gradient(sdf) = normalize(vec3(dFdx(d), dFdy(d), ..)) → normal map

Resolution:
  Column, AC unit:     64³  (nhỏ, detail quan trọng)
  Wall section:        128³ (medium)
  Full building shell: 256³ (lớn, chỉ bake 1 lần)
```

---

## Thứ tự build đề xuất

```
Phase 1  column_round + beam    ← thiếu hoàn toàn, visual impact lớn
Phase 3  hip + shed + eave      ← chỉ có kirizuma, cần 3 loại nữa
Phase 5  drain_pipe + ac_unit   ← 20% effort, 80% "chất Nhật"
Phase 4  door + window frames   ← depth cửa sổ hiện đang flat
Phase 2  wall_reveal + panel    ← shadow line tầng
Phase 6  BrickWall + RoofTile   ← sau khi geometry OK, trước bake
```
