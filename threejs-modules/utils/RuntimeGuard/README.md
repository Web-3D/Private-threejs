# RuntimeGuard

Kiểm tra performance budget mỗi frame — draw calls, triangle count, geometry leak.

## Props

| Prop            | Type     | Default   | Mô tả                   |
| --------------- | -------- | --------- | ----------------------- |
| `drawCallLimit` | `number` | `100`     | Ngưỡng draw calls/frame |
| `triangleLimit` | `number` | `500_000` | Ngưỡng triangle count   |

## Usage

```ts
import { RuntimeGuard } from '@utils/RuntimeGuard'

const guard = new RuntimeGuard(renderer, { drawCallLimit: 80 })

function animate(time: number) {
  requestAnimationFrame(animate)
  renderer.render(scene, camera)
  guard.check() // ← sau render(), trước frame tiếp theo
}

// Khi destroy scene:
guard.dispose()
```

## Lưu ý quan trọng

`renderer.info.render` bị Three.js **reset sau mỗi frame**. Phải gọi `check()` trong animation loop — **không dùng setInterval** vì sẽ luôn đọc giá trị 0.

Geometry leak detection: cảnh báo khi geometry count tăng liên tục 3 frame trở lên. Tăng 1 lần (thêm object bình thường) không trigger.

## Tương thích

Nhận bất kỳ renderer nào có `renderer.info` — WebGLRenderer và WebGPURenderer đều dùng được.
