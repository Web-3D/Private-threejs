# CharacterPool

Generic object pool — pre-allocate `N` slots trong constructor, sau đó chỉ `acquire()` / `release()`. Zero GPU allocation sau khi pool khởi tạo.

## Khi nào dùng

| Dùng khi | Không dùng khi |
|----------|----------------|
| Crowd simulation — spawn/despawn nhiều lần | Object xuất hiện 1 lần, không recycle |
| Số lượng instance fluctuate trong runtime | Tất cả instance luôn visible cùng lúc → dùng InstancedMesh |
| Character, projectile, particle thô | Object có lifecycle phức tạp khác nhau |
| Muốn zero GPU allocation per-spawn | Pool size không biết trước |

**So sánh:**
- `CharacterPool` — recycle Object3D instances, flexible nhưng N draw calls
- `THREE.InstancedMesh` — 1 draw call cho N instances, nhưng không flexible (cùng geometry/material)

## Props

| Prop | Type | Default | Mô tả |
|------|------|---------|-------|
| `factory` | `() => T` | — | Tạo một slot, gọi `poolSize` lần, **bắt buộc** |
| `poolSize` | `number` | — | Tổng số slot pre-allocated, **bắt buộc** |
| `warnThreshold` | `number` | `0.9` | Cảnh báo khi active/total ≥ threshold [0–1] |
| `disposer` | `(item: T) => void` | `undefined` | Cleanup geometry/material khi `dispose()` |

## Usage

```ts
import * as THREE from 'three'
import { CharacterPool } from 'threejs-modules/utils/CharacterPool'

const geo = new THREE.BoxGeometry(1, 2, 0.5)

// 1. Tạo pool — factory gọi đúng poolSize lần
const pool = new CharacterPool({
  factory: () => {
    const mat = new THREE.MeshStandardMaterial({ color: 0x4488cc })
    return new THREE.Mesh(geo, mat)
  },
  poolSize: 50,
  warnThreshold: 0.9,
  disposer: (mesh) => (mesh as THREE.Mesh).material.dispose(),
})

// 2. Spawn character
function spawnCharacter(position: THREE.Vector3): THREE.Mesh | null {
  const slot = pool.acquire()
  if (!slot) return null           // pool cạn — skip spawn
  slot.position.copy(position)
  scene.add(slot)
  return slot
}

// 3. Despawn character
function despawnCharacter(mesh: THREE.Mesh): void {
  scene.remove(mesh)
  pool.release(mesh)               // slot trở lại pool
}

// 4. Debug stats
console.log(`Active: ${pool.getActiveCount()} / ${pool.getPoolSize()}`)

// 5. Cleanup (dispose tất cả slots)
pool.dispose()
geo.dispose()                      // caller tự dispose shared geometry
```

## Quy tắc acquire/release

```
acquire() → slot thuộc về caller → caller phải release() khi xong
release() → slot trở về pool → caller KHÔNG dùng slot sau đó
```

**Invariant:** Mỗi slot ở ĐÚNG một trong hai trạng thái: `active` hoặc `free`. Không cả hai, không không thuộc trạng thái nào.

## Shared geometry pattern

```ts
// ✅ Một geometry, nhiều material — tiết kiệm GPU memory
const sharedGeo = new THREE.BoxGeometry(1, 2, 0.5)
const pool = new CharacterPool({
  factory: () => new THREE.Mesh(sharedGeo, new THREE.MeshStandardMaterial()),
  poolSize: 50,
  disposer: (mesh) => (mesh as THREE.Mesh).material.dispose(),
  // Không dispose sharedGeo trong disposer — dispose riêng sau pool.dispose()
})
pool.dispose()
sharedGeo.dispose()  // ← sau cùng
```

## warnThreshold và RuntimeGuard

`warnThreshold` trong CharacterPool = analog của `drawCallLimit` trong RuntimeGuard. Cả hai đều là budget warnings — không throw error, chỉ console.warn để dev biết đang gần limit.

Kết hợp:
```ts
// Animation loop
pool.acquire()  // → warn khi gần đầy
guard.check()   // → warn khi draw calls / triangles quá limit
```

## Performance budget

| Operation | Cost | Ghi chú |
|-----------|------|---------|
| `new CharacterPool(...)` | N × factory() | Chạy 1 lần trong constructor |
| `acquire()` | O(1) — Array.pop() | Zero allocation nếu pool còn slot |
| `release()` | O(1) — Set.delete() + Array.push() | Zero allocation |
| `dispose()` | O(N) | Xóa tất cả slots |

## Lỗi thường gặp

- ❌ **Dùng slot sau release()** → slot đang dùng bởi character khác → visual glitch.
- ❌ **Không gọi scene.remove() trước release()** → slot vẫn visible trong scene nhưng pool cho character khác acquire → hai character cùng mesh.
- ❌ **factory() tạo geometry mới mỗi lần** → N geometries GPU leak. Dùng shared geometry, chỉ tạo material mới.
- ❌ **pool.dispose() nhưng quên dispose sharedGeo** → geometry leak còn lại.
- ❌ **acquire() không check null** → pool cạn khi có spike spawn → crash. Luôn handle `if (!slot) return`.
