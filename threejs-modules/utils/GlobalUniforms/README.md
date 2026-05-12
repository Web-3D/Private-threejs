# GlobalUniforms

Singleton quản lý `uTime`, `uWeather`, `uDamage` — đồng bộ giá trị này cho mọi shader trong scene qua shared reference.

## Usage

```typescript
import { GlobalUniforms } from 'threejs-modules/utils/GlobalUniforms'

// Animation loop
const globalUniforms = GlobalUniforms.getInstance()
const clock = new THREE.Clock()

function animate() {
  requestAnimationFrame(animate)
  globalUniforms.update(clock.getDelta()) // ← ĐẦU TIÊN
  renderer.render(scene, camera)
}

// Trong shader constructor
GlobalUniforms.getInstance().inject(this.material)
// material.uniforms.uTime, uWeather, uDamage tự động sync
```

## Options / Methods

| Method             | Params                 | Ghi chú                   |                                |
| ------------------ | ---------------------- | ------------------------- | ------------------------------ |
| `getInstance()`    | —                      | Tạo hoặc trả về singleton |                                |
| `update(delta)`    | `delta: number` (giây) | Gọi đầu mỗi frame         |                                |
| `inject(material)` | `ShaderMaterial \      | RawShaderMaterial`        | Inject 3 uniforms vào material |
| `setWeather(v)`    | `0.0–1.0`              | 0 = nắng, 1 = mưa         |                                |
| `setDamage(v)`     | `0.0–1.0`              | 0 = nguyên, 1 = đổ nát    |                                |
| `dispose()`        | —                      | Reset singleton           |                                |

## Uniforms được inject

| Uniform    | Type    | Range        |
| ---------- | ------- | ------------ |
| `uTime`    | `float` | 0 → ∞ (giây) |
| `uWeather` | `float` | 0.0 → 1.0    |
| `uDamage`  | `float` | 0.0 → 1.0    |

## Dispose

```typescript
GlobalUniforms.getInstance().dispose()
```

## Lưu ý

- Gọi `update()` **trước** `renderer.render()` — không sau
- `inject()` sau khi material đã tạo — không khai báo uniforms thủ công trong shader
- Texture và geometry của caller tự dispose riêng
