# GlobalUniforms

Shared TSL uniform nodes — `uTime`, `uWeather`, `uDamage`. Import trực tiếp vào bất kỳ NodeMaterial node graph nào. Cập nhật `.value` một lần mỗi frame; mọi material dùng các nodes này tự nhận giá trị mới.

## Usage

```typescript
import { uTime, uWeather, uDamage, updateTime, setWeather, setDamage }
  from 'threejs-modules/utils/GlobalUniforms'
import { NodeMaterial } from 'three'
import { mix, vec3 } from 'three/tsl'

// Dùng trực tiếp trong node graph — không cần inject()
const material = new NodeMaterial()
material.colorNode = mix(vec3(0.2, 0.5, 1.0), vec3(0.2, 0.2, 0.3), uWeather)

// Animation loop — gọi một lần mỗi frame
const clock = new THREE.Clock()

renderer.setAnimationLoop(() => {
  updateTime(clock.getDelta())   // ← trước render
  renderer.render(scene, camera)
})
```

## API

| Export | Kiểu | Vai trò |
| --- | --- | --- |
| `uTime` | `UniformNode<number>` | Elapsed seconds, tăng qua `updateTime()` |
| `uWeather` | `UniformNode<number>` | 0 = nắng/khô, 1 = bão/ướt |
| `uDamage` | `UniformNode<number>` | 0 = nguyên vẹn, 1 = đổ nát hoàn toàn |
| `updateTime(delta)` | `(number) => void` | Advance `uTime.value += delta` |
| `setWeather(v)` | `(number) => void` | Clamp [0,1] rồi set `uWeather.value` |
| `setDamage(v)` | `(number) => void` | Clamp [0,1] rồi set `uDamage.value` |

## Uniform ranges

| Uniform | Range | Ghi chú |
| --- | --- | --- |
| `uTime` | 0 → ∞ | Seconds elapsed |
| `uWeather` | 0.0 – 1.0 | Dùng `setWeather()` để auto-clamp |
| `uDamage` | 0.0 – 1.0 | Dùng `setDamage()` để auto-clamp |

## Lưu ý

- Gọi `updateTime()` **trước** `renderer.render()` mỗi frame
- Các uniform nodes là **module-level singletons** — mọi file import cùng object reference
- Module nào cần `uTime` riêng (isolated, không sync) → tự tạo `uniform(0)` local thay vì import từ đây
