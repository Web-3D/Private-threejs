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

## TSL Implementation

TSL API thay đổi theo version — verify trong `node_modules/three/src/nodes/` trước khi dùng.

```typescript
// Chưa xác nhận toàn bộ TSL node names ở 0.174 — cần verify khi implement
import {
  texture, positionWorld, normalWorld,
  vec2, vec3, abs, pow, dot, add, mul, div
} from 'three/tsl'

const blendSharpness = 8.0

// Blend weights
const n = abs(normalWorld)                              // lấy absolute value
const nPow = pow(n, vec3(blendSharpness))              // sharpen
const nSum = dot(nPow, vec3(1.0))
const weights = div(nPow, nSum)                         // normalize

// 3 texture samples
const scaledPos = positionWorld.mul(uScale)
const xSample = texture(uMap, vec2(scaledPos.y, scaledPos.z))
const ySample = texture(uMap, vec2(scaledPos.x, scaledPos.z))
const zSample = texture(uMap, vec2(scaledPos.x, scaledPos.y))

// Blend
const triplanarColor = add(
  mul(xSample, weights.x),
  mul(ySample, weights.y),
  mul(zSample, weights.z)
)
```

**Nếu TSL node không tồn tại:** Fallback sang WGSL với import `?raw`, theo `shader-tsl` skill.

---

## Class structure chuẩn

```typescript
// threejs-modules/shaders/TriplanarMapping/index.ts

import type * as THREE from 'three'
import { GlobalUniforms } from '@utils/GlobalUniforms'

export interface TriplanarMappingOptions {
  map: THREE.Texture
  scale?: number          // World-space texture scale. Default: 1.0
  blendSharpness?: number // Blend edge sharpness [2-16]. Default: 8.0
}

export class TriplanarMapping {
  private material: THREE.ShaderMaterial | null = null
  private isDisposed = false

  constructor(opts: TriplanarMappingOptions) {
    this.material = new THREE.ShaderMaterial({
      uniforms: {
        uMap:            { value: opts.map },
        uScale:          { value: opts.scale ?? 1.0 },
        uBlendSharpness: { value: opts.blendSharpness ?? 8.0 },
      },
    })
    GlobalUniforms.getInstance().inject(this.material)
  }

  /** World-space texture scale. Giá trị lớn = texture nhỏ hơn trên surface. */
  setScale(value: number): void {
    if (this.isDisposed || !this.material) return
    this.material.uniforms.uScale.value = Math.max(0.001, value)
  }

  /** Blend sharpness [2, 16]. 8 là mặc định tốt cho hầu hết cases. */
  setBlendSharpness(value: number): void {
    if (this.isDisposed || !this.material) return
    this.material.uniforms.uBlendSharpness.value = Math.max(2, Math.min(16, value))
  }

  getMaterial(): THREE.ShaderMaterial {
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

**Lưu ý texture ownership:** `TriplanarMapping` không dispose `opts.map` vì caller
có thể dùng cùng texture cho nhiều material. Caller phải tự dispose texture.

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
