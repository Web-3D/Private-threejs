# InteractionSystem

Raycaster wrapper để add hover/click/pointer events lên 3D Object3D — không cần thư viện ngoài.

## Props

| Option | Type | Default | Mô tả |
|---|---|---|---|
| `camera` | `THREE.Camera` | required | Camera dùng để project tia raycaster |
| `canvas` | `HTMLElement` | required | Canvas element để bind mouse events |
| `recursive` | `boolean` | `false` | Intersect vào children của registered object không |

## Handlers

```ts
interface InteractionHandlers {
  onClick?: (event: InteractionEvent) => void
  onPointerEnter?: (event: InteractionEvent) => void
  onPointerLeave?: (object: THREE.Object3D) => void
}

interface InteractionEvent {
  object: THREE.Object3D   // registered object bị hit
  point: THREE.Vector3     // world-space intersection point
  distance: number         // khoảng cách từ camera
  originalEvent: MouseEvent
}
```

## Usage

```ts
import { InteractionSystem } from 'threejs-modules/utils/InteractionSystem'

const system = new InteractionSystem({
  camera,
  canvas: renderer.domElement,
})

system.add(mesh, {
  onPointerEnter: (e) => (mesh.material.emissive.set(0x333333)),
  onPointerLeave: ()  => (mesh.material.emissive.set(0x000000)),
  onClick:        (e) => console.log('clicked at', e.point),
})

// Animation loop
function animate() {
  system.update()   // hover detection
  renderer.render(scene, camera)
}

// Cleanup
system.dispose()
```

## Ghi chú

- `update()` chỉ cần để detect hover (pointerEnter/Leave). Click tự động qua event listener.
- `recursive: true` — nếu mesh có children và muốn intersect sâu vào. Chậm hơn một chút.
- Nếu nhiều object overlap: chỉ object gần nhất (index 0 của intersects) nhận event.
- Pointer NDC tính từ `canvas.getBoundingClientRect()` — hoạt động đúng kể cả canvas không chiếm full viewport.

## Performance

| Metric | Giá trị |
|---|---|
| Raycaster per frame | 1 (chung cho tất cả targets) |
| Event listeners | 2 (mousemove + click) — bind vào canvas |
| Memory | O(n) theo số target đăng ký |
