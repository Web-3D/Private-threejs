# ScrollTimeline

Scroll-driven camera path — map window/element scroll position lên `CatmullRomCurve3`, với smooth lerp. Dùng cho storytelling, product showcase, portfolio fly-through.

## Props

| Option | Type | Default | Mô tả |
|---|---|---|---|
| `camera` | `THREE.Camera` | required | Camera cần điều khiển |
| `points` | `THREE.Vector3[]` | required | Waypoints định nghĩa đường path (≥ 2) |
| `lookAt` | `LookAtMode` | `fixed at origin` | Camera nhìn về đâu |
| `scrollEl` | `HTMLElement \| Window` | `window` | Scroll container |
| `smoothing` | `number` | `0.08` | Lerp speed [0–1] — thấp = mượt hơn, chậm hơn |
| `startOffset` | `number` | `0` | Bắt đầu tính scroll từ px này trở đi |

## LookAtMode

```ts
type LookAtMode =
  | { type: 'fixed'; target: THREE.Vector3 }  // camera nhìn vào 1 điểm cố định
  | { type: 'tangent' }                         // camera nhìn theo hướng di chuyển
```

## Usage

```ts
import { ScrollTimeline } from 'threejs-modules/utils/ScrollTimeline'

const timeline = new ScrollTimeline({
  camera,
  points: [
    new THREE.Vector3(0,  2, 10),
    new THREE.Vector3(5,  3,  5),
    new THREE.Vector3(-4, 1, -5),
    new THREE.Vector3(0,  0, -10),
  ],
  lookAt: { type: 'fixed', target: new THREE.Vector3(0, 0, 0) },
  smoothing: 0.06,
})

// Trong animation loop
function animate() {
  timeline.update()  // lerp camera → target
  renderer.render(scene, camera)
}

// Cleanup
timeline.dispose()
```

## Ghi chú

- `getPointAt(t)` (arc-length normalized) thay vì `getPoint(t)` — camera di chuyển đều dù waypoints phân bố không đều.
- `smoothing = 0.08` → ~12 frame lag ở 60fps. Giảm xuống 0.04 nếu muốn mượt hơn.
- `type: 'tangent'` — camera nhìn về điểm t+0.01 trên curve → hướng nhìn theo đường đi.
- Nếu page không scroll được, thêm element có chiều cao đủ lớn (ví dụ `300vh`).
