---
name: triplanar-mapping
description: Use when applying world-space textures to meshes without UV coordinates, or when implementing tri-planar shader blending. Triggers when creating TriplanarMapping module or any shader that samples texture 3 times by world normal. Also triggers on Vietnamese phrases: "tri-planar", "triplanar", "world-space texture", "bypass UV", "phủ texture không cần UV", "texture theo normal", "không cần UV". Do NOT use for standard UV-mapped textures — those need no triplanar logic.
---

## Dependencies — Active đồng thời

Skill này YÊU CẦU apply cùng lúc:
- `dispose-pattern` — TriplanarMapping class có ShaderMaterial + Texture cần dispose
- `shader-tsl` — viết bằng TSL, uniform prefix `u`, honest-uncertain rule cho API
- `global-uniforms` — inject `uTime` nếu shader có animation (wind, weather)

---

## Implementation checklist

- [ ] Verify TSL node names trong `node_modules/three/src/nodes/` — `positionWorld`, `normalWorld`, `texture` có thể đổi tên theo version
- [ ] `blendSharpness` default = 8.0 — chỉ điều chỉnh sau khi test visual với sphere
- [ ] Blend weights: confirm `n.x + n.y + n.z ≈ 1.0` sau normalize step
- [ ] `GlobalUniforms.inject()` gọi ngay sau `new ShaderMaterial(...)` nếu dùng `uTime`
- [ ] Texture ownership: **không** gọi `opts.map.dispose()` trong class — caller sở hữu texture
- [ ] Dispose chain: chỉ `material.dispose()`, không dispose texture

---

## Tri-planar là gì và khi nào dùng

Tri-planar sampling = sample texture 3 lần theo 3 mặt phẳng thế giới (XY, YZ, XZ),
blend kết quả theo hướng normal của surface. Không cần UV.

**Dùng khi:**
- AI-generated mesh (Tripo/Meshy) có UV xấu hoặc lặp lại pattern rõ
- Terrain, rock, ground — UV unwrap rất khó, tri-planar tự nhiên hơn
- Environment object tái sử dụng nhiều lần với texture khác nhau

**Không dùng khi:**
- Character skin — cần texture baked với UV chính xác
- Asset có UV đẹp sẵn và không có seam vấn đề

---

## Công thức toán học

### Bước 1: Tính blend weights từ world normal

```glsl
// World normal phải normalized trước
vec3 n = abs(worldNormal);           // Lấy giá trị tuyệt đối — mọi hướng đều dương
n = pow(n, vec3(blendSharpness));    // Tăng contrast — sharp blend hơn
n /= (n.x + n.y + n.z);             // Normalize để tổng = 1.0
// n.x = weight cho mặt YZ (nhìn từ trái/phải)
// n.y = weight cho mặt XZ (nhìn từ trên/dưới)
// n.z = weight cho mặt XY (nhìn từ trước/sau)
```

**`blendSharpness` ảnh hưởng thế nào:**
- Giá trị thấp (2-4) → blend mềm, transition rộng, nhìn "melty"
- Giá trị cao (8-16) → blend sắc, transition hẹp, nhìn "crisp"
- Default khuyến nghị: **8.0** — balance giữa artifact và sharpness

### Bước 2: Sample texture 3 lần

```glsl
vec2 scale = vec2(uScale);  // Scale đồng nhất, hoặc vec2(uScaleX, uScaleY) nếu cần khác nhau

vec4 xSample = texture(uMap, worldPos.yz * scale);  // Mặt nhìn từ X
vec4 ySample = texture(uMap, worldPos.xz * scale);  // Mặt nhìn từ Y (top)
vec4 zSample = texture(uMap, worldPos.xy * scale);  // Mặt nhìn từ Z
```

### Bước 3: Blend

```glsl
vec4 result = xSample * n.x + ySample * n.y + zSample * n.z;
```

---

## TSL Implementation — dùng built-in trước

Three.js 0.174 có sẵn `triplanarTexture()` trong `three/tsl` — **không cần tự viết**.

```typescript
// ✅ Cách đúng — dùng built-in
import { triplanarTexture, positionWorld, normalWorld, texture, uniform } from 'three/tsl'
// Verified: triplanarTexture ✅, positionWorld ✅, normalWorld ✅ — node_modules/three/src/nodes/

material.colorNode = triplanarTexture(
  texture(map),   // textureXNode — dùng chung cho cả 3 mặt
  null,           // textureYNode — null = dùng lại textureXNode
  null,           // textureZNode — null = dùng lại textureXNode
  uScale,         // scaleNode — uniform float
  positionWorld,  // positionNode — world-space (default là positionLocal)
  normalWorld     // normalNode — world-space (default là normalLocal)
)
```

**Local vs World space:**
- Default (`positionLocal`, `normalLocal`) — texture bám theo mesh khi rotate → dùng cho object độc lập
- `positionWorld`, `normalWorld` — texture cố định trong không gian → dùng cho terrain, environment

**Giới hạn của built-in:** Không có `blendSharpness` parameter — blend formula cố định (`abs(n) / dot(abs(n), vec3(1))`). Nếu cần control sharpness → xem "Advanced" bên dưới.

### Advanced — khi cần blendSharpness control

```typescript
// Chỉ dùng khi built-in không đủ
import { abs, pow, dot, vec3, uniform } from 'three/tsl'
// abs ✅, pow ✅, dot ✅, vec3 ✅ — verified MathNode.js + TSLCore.js

const uBlend = uniform(8.0)
let bf = normalWorld.abs()
bf = pow(bf, vec3(uBlend))            // sharpen — thêm control
bf = bf.div(bf.dot(vec3(1.0)))        // normalize → tổng = 1.0
```

---

## Class structure chuẩn

```typescript
// threejs-modules/shaders/TriplanarMapping/index.ts

import { NodeMaterial } from 'three'
import { triplanarTexture, positionWorld, normalWorld, texture, uniform } from 'three/tsl'
import type * as THREE from 'three'

export interface TriplanarMappingOptions {
  map: THREE.Texture
  scale?: number   // World-space texture scale. Default: 1.0
}

export class TriplanarMapping {
  private material: NodeMaterial | null = null
  private isDisposed = false
  private uScale = uniform(1.0)

  constructor(opts: TriplanarMappingOptions) {
    this.uScale.value = opts.scale ?? 1.0

    const material = new NodeMaterial()
    material.colorNode = triplanarTexture(
      texture(opts.map),
      null, null,
      this.uScale,
      positionWorld,
      normalWorld
    )
    this.material = material
  }

  /** World-space texture scale. Giá trị lớn = texture nhỏ hơn trên surface. */
  setScale(value: number): void {
    if (this.isDisposed) return
    this.uScale.value = Math.max(0.001, value)
  }

  getMaterial(): NodeMaterial {
    if (!this.material) throw new Error('TriplanarMapping: đã dispose')
    return this.material
  }

  dispose(): void {
    if (this.isDisposed) return
    this.material?.dispose()
    this.material = null
    this.isDisposed = true
    // Texture (opts.map) KHÔNG dispose ở đây — caller sở hữu texture
  }
}
```

**Lưu ý texture ownership:** Caller phải tự dispose texture — `TriplanarMapping` không dispose `opts.map`.

---

## Performance budget

| Operation                      | Cost                       | Ghi chú                                 |
| ------------------------------ | -------------------------- | --------------------------------------- |
| 3× texture sample/fragment     | Cao nhất — bandwidth-bound | Core của tri-planar — không tránh được  |
| `pow(n, vec3(blendSharpness))` | ~4–8× clock vs `mul`       | Chạy 1 lần/fragment — chấp nhận được    |
| `normalWorld` lookup           | 0 overhead                 | Built-in pipeline value, không tính lại |
| Uniform update mỗi frame       | < 0.01ms                   | CPU write — thoải mái                   |

**Tri-planar tốn hơn UV-mapped 3×** (3 sample vs 1). Chỉ dùng khi mesh không có UV sạch hoặc UV seam rõ.

---

## Artifact thường gặp và fix

### Seam tại góc 45°

**Nguyên nhân:** Blend weights không normalized đúng.
**Fix:** Đảm bảo `n.x + n.y + n.z = 1.0` sau normalize. Kiểm tra công thức divide.

### Texture bị stretch ở mặt đứng

**Nguyên nhân:** Scale không đồng nhất giữa XY/YZ/XZ planes.
**Fix:** Dùng `uScale` đơn (1 float) thay vì scale riêng mỗi axis.

### Blend quá mềm, texture "melting"

**Nguyên nhân:** `blendSharpness` quá thấp.
**Fix:** Tăng lên 8-12. Test với sphere để thấy rõ blend zone.

### Texture lặp lại pattern rõ

**Nguyên nhân:** Scale quá nhỏ (texture to trên surface).
**Fix:** Tăng `uScale`. Kết hợp `WorldNoise` shader để break pattern.

---

## Checklist verify

- [ ] Normal được normalize trước khi tính blend weights
- [ ] `n.x + n.y + n.z` xấp xỉ 1.0 sau normalize (kiểm tra bằng debug color)
- [ ] `blendSharpness` = 8.0 (default) — adjust chỉ khi có visual issue
- [ ] Texture không bị dispose bởi TriplanarMapping class
- [ ] `GlobalUniforms.inject()` được gọi sau khi material tạo xong
- [ ] TSL node names đã verify trong `node_modules/three/src/nodes/`

---

## Lỗi thường gặp

- ❌ **Dùng object-space normal thay vì world-space** → texture xoay theo mesh khi mesh rotate — phải dùng `normalWorld`
- ❌ **Quên normalize blend weights** → `n.x + n.y + n.z > 1.0` → màu sáng hơn thực tế ở vùng chuyển tiếp
- ❌ **`blendSharpness = 1` ngay từ đầu** → blend quá mềm, texture trông "melting" — start 8.0, điều chỉnh sau
- ❌ **Dispose `opts.map` trong `dispose()`** → texture bị hủy, mesh render đen — caller sở hữu texture
- ❌ **Dùng TSL node names chưa verify** → runtime error silent khi Three.js đổi tên — luôn grep `node_modules/three/src/nodes/`
- ❌ **Dùng `{ value: x }` uniforms với NodeMaterial** → NodeMaterial không có `material.uniforms` — xem `shader-tsl` skill
