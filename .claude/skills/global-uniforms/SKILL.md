---
name: global-uniforms
description: Use when setting up shared uniforms across multiple shaders, syncing uTime/uWeather/uDamage, or injecting global state into materials. Triggers when creating GlobalUniforms utility or when multiple shaders need the same animated value. Also triggers on Vietnamese phrases: "uTime", "uWeather", "uDamage", "global uniform", "đồng bộ shader", "sync shader", "chia sẻ uniform", "uniform chung". Do NOT use for per-shader uniforms that are not shared — those go directly in the shader class.
---

## Dependencies — Active đồng thời

Skill này YÊU CẦU apply cùng lúc:
- `dispose-pattern` — GlobalUniforms là singleton có lifecycle, cần dispose đúng
- `shader-tsl` — uniform naming convention (`u` prefix), inject vào ShaderMaterial

---

## Tại sao cần GlobalUniforms

Không có GlobalUniforms → mỗi shader tự manage `uTime` riêng → không sync được.
Một shader chạy trước, một shader chạy sau → `uTime` lệch nhau giữa các material.

GlobalUniforms là **single source of truth** cho toàn scene:
- Cập nhật 1 lần mỗi frame
- Tất cả shader nhận cùng 1 value
- Dispose 1 lần khi scene kết thúc

---

## 3 Uniforms cố định (tên không được đổi)

| Uniform | Type | Range | Ý nghĩa |
|---------|------|-------|---------|
| `uTime` | `float` | 0 → ∞ (giây) | Thời gian animation — tăng mỗi frame |
| `uWeather` | `float` | 0.0 → 1.0 | 0 = khô/nắng, 1 = mưa/ướt |
| `uDamage` | `float` | 0.0 → 1.0 | 0 = nguyên vẹn, 1 = đổ nát hoàn toàn |

Tên cố định để mọi shader trong project đều dùng đúng tên — không tự đặt tên khác.

---

## Implementation chuẩn

```typescript
// src/utils/GlobalUniforms.ts

import type * as THREE from 'three'

type InjectableMaterial = THREE.ShaderMaterial | THREE.RawShaderMaterial

export class GlobalUniforms {
  private static instance: GlobalUniforms | null = null
  private isDisposed = false

  // Uniform objects — reference được giữ trong nhiều material
  readonly uTime     = { value: 0 }
  readonly uWeather  = { value: 0 }   // 0.0 = dry/sun, 1.0 = rain/wet
  readonly uDamage   = { value: 0 }   // 0.0 = intact, 1.0 = destroyed

  private constructor() {}

  /** Lấy singleton instance. Tạo mới nếu chưa có. */
  static getInstance(): GlobalUniforms {
    if (!GlobalUniforms.instance || GlobalUniforms.instance.isDisposed) {
      GlobalUniforms.instance = new GlobalUniforms()
    }
    return GlobalUniforms.instance
  }

  /**
   * Gọi mỗi frame trong animation loop — luôn là lệnh đầu tiên trước render.
   * deltaTime tính bằng giây (THREE.Clock.getDelta() output).
   */
  update(deltaTime: number): void {
    if (this.isDisposed) return
    this.uTime.value += deltaTime
  }

  /**
   * Inject 3 uniforms vào material.
   * Dùng cho ShaderMaterial — inject trực tiếp vào uniforms object.
   * Sau khi inject, material tự động nhận update mỗi frame (shared reference).
   */
  inject(material: InjectableMaterial): void {
    if (this.isDisposed) return
    material.uniforms.uTime    = this.uTime
    material.uniforms.uWeather = this.uWeather
    material.uniforms.uDamage  = this.uDamage
  }

  /** Trạng thái thời tiết. Range [0, 1]. */
  setWeather(value: number): void {
    if (this.isDisposed) return
    this.uWeather.value = Math.max(0, Math.min(1, value))
  }

  /** Mức độ hư hại. Range [0, 1]. */
  setDamage(value: number): void {
    if (this.isDisposed) return
    this.uDamage.value = Math.max(0, Math.min(1, value))
  }

  dispose(): void {
    if (this.isDisposed) return
    GlobalUniforms.instance = null
    this.isDisposed = true
  }
}
```

---

## Tích hợp vào animation loop

```typescript
// src/world/MyWorld.ts

import { GlobalUniforms } from '@utils/GlobalUniforms'
import { RuntimeGuard } from '@utils/RuntimeGuard'   // performance-budget skill

class MyWorld {
  private globalUniforms: GlobalUniforms
  private clock = new THREE.Clock()
  private guard: RuntimeGuard

  constructor(private renderer: THREE.WebGPURenderer) {
    this.globalUniforms = GlobalUniforms.getInstance()
    this.guard = new RuntimeGuard(renderer)
  }

  private animate(): void {
    requestAnimationFrame(() => this.animate())

    const delta = this.clock.getDelta()
    this.globalUniforms.update(delta)   // ← luôn là lệnh ĐẦU TIÊN

    // ... update objects, animations ...

    this.renderer.render(this.scene, this.camera)
    this.guard.check()                  // ← luôn là lệnh CUỐI CÙNG
  }

  dispose(): void {
    this.globalUniforms.dispose()
    // ... dispose other resources ...
  }
}
```

**Thứ tự trong frame:**
1. `globalUniforms.update(delta)` — cập nhật state
2. Scene update, animation
3. `renderer.render()`
4. `guard.check()` — verify budget

---

## Inject vào shader

```typescript
// Trong shader class constructor

import { GlobalUniforms } from '@utils/GlobalUniforms'

class TriplanarShader {
  private material: THREE.ShaderMaterial | null = null

  constructor() {
    this.material = new THREE.ShaderMaterial({
      uniforms: {
        uScale:    { value: 1.0 },    // per-shader uniform
        uBlend:    { value: 8.0 },    // per-shader uniform
        // Global uniforms sẽ inject sau — không khai báo ở đây
      },
    })

    // Inject sau khi material tạo xong
    GlobalUniforms.getInstance().inject(this.material)
    // Giờ material.uniforms.uTime, uWeather, uDamage đã có
  }
}
```

**Tại sao inject sau, không khai báo trong constructor:**
Nếu khai báo `uTime: { value: 0 }` trong uniforms object → tạo reference mới, không phải
reference từ GlobalUniforms → không nhận update tự động.

---

## Cây quyết định

```
Uniform này có dùng ở nhiều shader không?
├── Có → dùng GlobalUniforms (uTime, uWeather, uDamage)
└── Không → khai báo trực tiếp trong shader class

Cần thêm uniform global mới?
├── Nó có ý nghĩa toàn scene không? (time, weather, damage)
│    └── Có → thêm vào GlobalUniforms class + update naming table
└── Nó chỉ dùng cho 1 hệ thống?
     └── Phải → để trong class đó, không global
```

---

## Lỗi thường gặp

- ❌ **`uTime: { value: 0 }` trong shader constructor** → tạo reference riêng, không sync với global
- ❌ **Quên gọi `globalUniforms.update(delta)` mỗi frame** → `uTime` đứng yên, animation không chạy
- ❌ **Gọi `update()` sau `render()`** → frame đầu tiên luôn bị lệch 1 delta
- ❌ **Tạo `new GlobalUniforms()`** → phá singleton, 2 instance không sync nhau — phải dùng `getInstance()`
- ❌ **Không dispose singleton khi scene kết thúc** → memory leak, instance cũ còn trong memory
