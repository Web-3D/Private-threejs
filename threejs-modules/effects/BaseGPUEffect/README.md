# BaseGPUEffect

Abstract base class cho GPU visual effects dùng geometry (mesh/group). Cung cấp `dispose()`, `setVisible()`, và `onDispose` hook — chuẩn hóa lifecycle cho toàn bộ effects layer.

**Dùng khi:** Effect là geometry-based (Mesh, Group, Lines). Nếu effect dùng `THREE.Points` → dùng `GPUParticleSystem` thay thế.

## Cách extend

```typescript
import * as THREE from 'three'
import { BaseGPUEffect } from 'threejs-modules/effects/BaseGPUEffect'

class BurstRing extends BaseGPUEffect {
  readonly root = new THREE.Group()  // khai báo bắt buộc
  private geo: THREE.TorusGeometry
  private mat: THREE.MeshBasicMaterial

  constructor(color: THREE.ColorRepresentation) {
    super()
    this.geo = new THREE.TorusGeometry(1.0, 0.02, 8, 64)
    this.mat = new THREE.MeshBasicMaterial({ color })
    this.root.add(new THREE.Mesh(this.geo, this.mat))
  }

  update(time: number): void {
    if (this.isDisposed) return
    this.root.rotation.y = time
    this.root.scale.setScalar(1 + Math.sin(time * 3) * 0.1)
  }

  protected onDispose(): void {
    this.geo.dispose()
    this.mat.dispose()
    // base đã gọi root.parent?.remove(root) trước khi onDispose chạy
  }
}

// Dùng:
const ring = new BurstRing(0x00ffcc)
scene.add(ring.root)

// Mỗi frame:
ring.update(clock.getElapsedTime())

// Ẩn tạm:
ring.setVisible(false)

// Xong hẳn:
ring.dispose()
```

## API

| Method / Field | Scope | Mô tả |
|---|---|---|
| `abstract readonly root` | subclass | Khai báo Group/Mesh/Points — điểm gắn vào scene |
| `protected isDisposed` | subclass | Guard — check trước mọi lời gọi |
| `protected abstract onDispose()` | subclass | Dispose geometry, material, texture |
| `setVisible(bool)` | public | Toggle visibility không cần remove/add scene |
| `dispose()` | public | Remove root + gọi onDispose + set isDisposed |

## Dispose lifecycle

```
effect.dispose()
  → isDisposed guard (early return nếu đã dispose)
  → root.parent?.remove(root)   — gỡ khỏi scene
  → this.onDispose()            — subclass dispose geometry/material
  → isDisposed = true
```

## So với GPUParticleSystem

| | `BaseGPUEffect` | `GPUParticleSystem` |
|---|---|---|
| Render primitive | Mesh / Group / Lines | THREE.Points |
| Update param | `time: number` | `time: number` |
| Geometry | Tự quản lý | Tự động build từ count |
| Dùng khi | Trail, ribbon, billboard, ring | Sparks, fire, smoke, rain |

## Lưu ý

- `root` phải là `readonly` — không reassign sau constructor
- `onDispose()` là `protected abstract` — TypeScript ép buộc subclass implement
- Gọi `dispose()` một lần là đủ — guard `isDisposed` ngăn double-dispose
- Texture do caller truyền vào → caller dispose, không dispose trong `onDispose()`
