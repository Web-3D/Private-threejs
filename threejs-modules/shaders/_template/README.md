# ShaderName

## Mô tả

_Shader làm gì, dùng cho hiệu ứng gì._

## Props

| Prop    | Type          | Default    | Mô tả            |
| ------- | ------------- | ---------- | ---------------- |
| `color` | `THREE.Color` | `0xffffff` | Màu chính        |
| `speed` | `number`      | `1.0`      | Tốc độ animation |

## Usage

```typescript
import { ShaderName } from './index'

const shader = new ShaderName({ color: 0x00aaff, speed: 0.5 })
const mesh = new THREE.Mesh(geometry, shader.get())
scene.add(mesh)

// Trong animation loop
shader.update(clock.getElapsedTime())

// Khi destroy
shader.dispose()
```

## Cần trong scene

- Geometry: _loại geometry phù hợp_
- Light: _loại ánh sáng cần thiết (nếu có)_

## Performance

- Draw calls: +1
- Memory: ~_X_ MB (texture) + geometry

## Ghi chú

_Lý do kỹ thuật đặc biệt nếu có._
