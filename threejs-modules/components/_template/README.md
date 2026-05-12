# ComponentName

## Mô tả

_Component làm gì, hiển thị gì trong scene._

## Props

| Prop       | Type            | Default   | Mô tả  |
| ---------- | --------------- | --------- | ------ |
| `position` | `THREE.Vector3` | `(0,0,0)` | Vị trí |

## Usage

```typescript
import { ComponentName } from './index'

const obj = new ComponentName({ position: new THREE.Vector3(0, 1, 0) })
scene.add(obj.mesh)

// Trong animation loop
obj.update(clock.getElapsedTime())

// Khi destroy
obj.dispose()
```

## Performance

- Draw calls: +_N_
- Triangles: ~\_X_k
- Textures: _list_

## Dependencies

- `three@0.174+`
