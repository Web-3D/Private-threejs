---
name: shader-tsl
description: Use when writing or modifying shaders — vertex/fragment shaders, NodeMaterial, ShaderMaterial, custom uniforms, GLSL/WGSL code, or TSL compositions. Triggers in src/shaders/. Also triggers on Vietnamese phrases: "viết shader", "tạo shader", "shader cho", "uniform", "GLSL", "đổ màu", "bề mặt". Do NOT use for built-in materials (MeshStandardMaterial, MeshBasicMaterial) without custom shader logic — those need no shader-specific patterns.
---

## Dependencies — Active đồng thời

Skill này YÊU CẦU apply cùng lúc:
- `dispose-pattern` — mọi shader class có GPU resource (ShaderMaterial, Texture) phải có dispose chain đầy đủ

---

## Thứ tự ưu tiên ngôn ngữ shader (bắt buộc theo thứ tự này)

1. **TSL** — mặc định cho mọi shader mới. Three.js Shading Language chạy trên cả WebGPU lẫn WebGL.
2. **WGSL** — chỉ dùng khi TSL không đủ khả năng. Import bằng `?raw`.
3. **GLSL** — phương án cuối cùng. BẮT BUỘC kèm `README.md` giải thích tại sao TSL/WGSL không dùng được.

---

## Tổ chức file

```
src/shaders/MyShader/
├── index.ts       ← class + uniforms interface, điểm vào duy nhất
├── shader.wgsl    ← nếu dùng WGSL (import ?raw)
└── README.md      ← bắt buộc nếu dùng GLSL, giải thích lý do
```

**Cấm inline shader string quá 5 dòng** — tách ra file riêng:

```typescript
// ✅ Đúng
import shader from '@shaders/MyShader/shader.wgsl?raw'

// ❌ Sai — inline quá dài
const vert = `
  void main() { ... 50 dòng ... }
`
```

---

## Implementation checklist

- [ ] Chọn material type: `NodeMaterial` (fully custom) hay `MeshStandardNodeMaterial` (PBR + override)?
- [ ] Import TSL nodes từ `'three/tsl'`: `uniform`, `vec3`, `float`, `uv`, `positionWorld`, `normalWorld`
- [ ] Tạo uniform bằng `uniform(value)` — **không phải** `{ value: x }` kiểu ShaderMaterial
- [ ] Assign node vào material: `material.colorNode`, `material.normalNode`, `material.outputNode`
- [ ] Setter update qua `.value` trên uniform node object, không phải `material.uniforms`
- [ ] Không tạo `new NodeMaterial()` trong animation loop — compile shader lần đầu tốn 50–500ms
- [ ] `dispose()` material khi class destroy — `NodeMaterial` giữ GPU resource như `ShaderMaterial`

---

## Template class chuẩn

```typescript
import { ShaderMaterial } from 'three'
import type * as THREE from 'three'

// Interface uniform — bắt buộc định nghĩa rõ ràng, không dùng any
export interface MyShaderOptions {
  intensity?: number
  color?: THREE.Color
}

export class MyShader {
  private material: ShaderMaterial | null = null
  private isDisposed = false

  constructor(opts: MyShaderOptions = {}) {
    this.material = new ShaderMaterial({
      uniforms: {
        uIntensity: { value: opts.intensity ?? 1.0 },
        uColor: { value: opts.color ?? new THREE.Color(0xffffff) },
      },
    })
  }

  /** Cường độ ánh sáng. Range [0, 10]. */
  setIntensity(value: number): void {
    if (this.isDisposed || !this.material) return
    if (Number.isNaN(value)) return                          // Validate input
    this.material.uniforms.uIntensity.value = Math.max(0, Math.min(10, value)) // Clamp range
  }

  getMaterial(): ShaderMaterial {
    if (!this.material) throw new Error(`${this.constructor.name}: đã dispose`)
    return this.material
  }

  dispose(): void {
    if (this.isDisposed) return
    this.material?.dispose()
    this.material = null
    this.isDisposed = true
  }
}
```

Áp dụng đầy đủ `dispose-pattern` skill cho mọi shader class.

---

## Template TSL — ưu tiên dùng cái này

```typescript
import { NodeMaterial } from 'three'
import { uniform, vec3, mix, uv } from 'three/tsl'  // verify import path nếu dùng version mới

export class MyTSLShader {
  private material: NodeMaterial | null = null
  private isDisposed = false

  // Uniform nodes — update qua .value, không phải material.uniforms
  private uIntensity = uniform(1.0)
  private uColor = uniform(vec3(1, 1, 1))

  constructor() {
    const material = new NodeMaterial()
    material.colorNode = this.uColor.mul(this.uIntensity)
    this.material = material
  }

  setIntensity(value: number): void {
    if (this.isDisposed) return
    this.uIntensity.value = Math.max(0, Math.min(10, value))
  }

  getMaterial(): NodeMaterial {
    if (!this.material) throw new Error(`${this.constructor.name}: đã dispose`)
    return this.material
  }

  dispose(): void {
    if (this.isDisposed) return
    this.material?.dispose()
    this.material = null
    this.isDisposed = true
  }
}
```

**Khi nào dùng `MeshStandardNodeMaterial` thay vì `NodeMaterial`:**
- Cần giữ PBR lighting (roughness, metalness, AO) + chỉ override 1–2 node
- `colorNode`, `normalNode`, `roughnessNode` có thể override riêng lẻ mà không viết lại toàn bộ lighting

---

## Template class chuẩn (ShaderMaterial — dùng khi cần GLSL)

- **Prefix `u`** bắt buộc cho mọi uniform: `uTime`, `uColor`, `uWaveSpeed`, `uFresnelPower`
- **Global uniforms** — sync qua `GlobalUniforms` util, tên cố định không đổi:
  - `uTime` — thời gian animation tính bằng giây
  - `uWeather` — trạng thái thời tiết (0.0 = khô, 1.0 = mưa)
  - `uDamage` — mức độ hư hại (0.0 = nguyên vẹn, 1.0 = đổ nát)
- **Per-shader uniforms** — đặt tên mô tả rõ ý nghĩa: `uWaveHeight`, `uEdgeSoftness`
- **JSDoc bắt buộc** cho mỗi setter — ghi rõ range, đơn vị, tác dụng phụ
- **Không truy cập trực tiếp** `material.uniforms.uX.value =` từ code bên ngoài class — phải qua setter

---

## Quy tắc Honest-Uncertain

Three.js thay đổi API liên tục. Khi không chắc chắn 100% API tồn tại ở version 0.174:

```typescript
// ✅ Đúng — nói rõ sự không chắc chắn trước khi dùng
// Chưa xác nhận NodeMaterial.fragmentNode còn tồn tại ở 0.174 — cần verify
material.fragmentNode = colorNode

// ❌ Sai — viết như thể chắc chắn mà không kiểm tra
material.fragmentNode = colorNode
```

- Không chắc API → verify trong `node_modules/three/src/` hoặc báo user kiểm tra
- Không tự bịa tên method, tên uniform, tên node type
- Không giả định signature của function khi chưa xem source

---

## Performance budget

| Operation                 | Cost                                   | Ghi chú                                |
| ------------------------- | -------------------------------------- | -------------------------------------- |
| Texture sample            | Cao nhất — bandwidth-bound             | Giữ < 4 sample/fragment lý tưởng       |
| `pow()`, `exp()`, `log()` | ~4–8× clock cycles so với `add`/`mul`  | Dùng polynomial approximation nếu được |
| Branch (`if/else`)        | GPU chạy cả 2 nhánh                    | Dùng `mix()` + step() thay thế         |
| `discard`                 | Phá early-Z — toàn fragment phải xử lý | Tránh hoàn toàn trên mobile            |
| Shader compilation        | 50–500ms one-time                      | Không tạo material mới trong game loop |
| Uniform update (TSL)      | ~0ms — CPU write, GPU read next frame  | Thoải mái update mỗi frame             |

**Verify shader cost thực tế:** Chrome DevTools → Performance → GPU track (chỉ có trong Chrome với `--enable-gpu-instrumentation`)

---

## Tối ưu hiệu năng shader

- **Tránh `pow()`, `exp()`, `log()`** trong fragment nếu có thể dùng polynomial approximation thay thế — các hàm này tốn nhiều clock cycles
- **Dùng `mix()` thay if/else** trong shader — GPU ghét branch divergence, `mix()` chạy song song
- **Giảm số lần đọc texture** mỗi fragment — mỗi texture lookup tốn bandwidth
- **Fold constant ngoài `main()`** — tính toán không đổi theo frame nên tính 1 lần ở CPU
- **Tránh `discard`** trên mobile — `discard` phá vỡ early-Z optimization, GPU phải xử lý toàn bộ fragment

---

## Lỗi thường gặp

- ❌ **Dùng `{ value: x }` uniform với `NodeMaterial`** → sai hoàn toàn, NodeMaterial không có `material.uniforms` — phải dùng `uniform(x)` từ TSL
- ❌ **Tạo `new NodeMaterial()` trong animation loop** → shader recompile mỗi frame → freeze 50–500ms
- ❌ **Inline shader string > 5 dòng** → khó đọc, không có syntax highlight, tách ra file
- ❌ **Không dispose `ShaderMaterial` / `NodeMaterial`** → GPU memory leak — tham chiếu `dispose-pattern` skill
- ❌ **Truy cập trực tiếp `material.uniforms.uX.value`** từ ngoài class → bypass validation, dễ gây bug
- ❌ **Dùng Three.js API mà chưa verify version** → runtime error khó debug
- ❌ **Không có interface cho options** → mất type safety, mọi prop thành `any`
