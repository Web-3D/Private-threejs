# LODBillboard

Swap 3D mesh → billboard sprite tự động khi camera vượt qua ngưỡng `threshold`. Không cần gọi update thủ công — `THREE.LOD.autoUpdate = true` xử lý tự động.

## Khi nào dùng

| Dùng khi | Không dùng khi |
|----------|----------------|
| Crowd simulation — 50+ character tầm xa | Character foreground cần detail cao |
| Trees, props có mesh nặng ở tầm xa | Animation phải đồng bộ chính xác tại mọi distance |
| Scene có nhiều instance cùng loại | Billboard không đại diện đủ cho hình dạng phức tạp |
| Performance-critical với draw call budget | Object hay được nhìn từ trên xuống |

## Cơ chế hoạt động

```
camera distance < threshold  →  3D Mesh     (draw 1 mesh)
camera distance ≥ threshold  →  Billboard Sprite  (draw 1 sprite)
```

`THREE.Sprite` tự quay để luôn đối mặt camera — không cần tính toán rotation thủ công.  
Billboard sprite chỉ chiếm 2 triangles (PlaneGeometry mặc định của Sprite).

## Props

| Prop | Type | Default | Mô tả |
|------|------|---------|-------|
| `mesh` | `THREE.Mesh` | — | Mesh 3D đầy đủ tại tầm gần, **bắt buộc** |
| `billboardMap` | `THREE.Texture` | — | Texture cho sprite tại tầm xa, **bắt buộc** |
| `billboardScale` | `number` | `1` | Kích thước sprite world units — nên match chiều cao mesh |
| `threshold` | `number` | `20` | Khoảng cách switch mesh → billboard |
| `hysteresis` | `number` | `0` | Fraction để tránh flicker: 0.1 = ±10% threshold |

## Usage

```ts
import * as THREE from 'three'
import { LODBillboard } from 'threejs-modules/components/LODBillboard'

// 1. Tạo mesh 3D (caller sở hữu)
const geometry = new THREE.BoxGeometry(1, 2, 0.5)
const material = new THREE.MeshStandardMaterial({ color: 0x4488cc })
const mesh = new THREE.Mesh(geometry, material)

// 2. Tải billboard texture (caller sở hữu)
const billboardMap = new THREE.TextureLoader().load('character_billboard.png')

// 3. Tạo LODBillboard
const lodb = new LODBillboard({
  mesh,
  billboardMap,
  billboardScale: 2,     // khớp chiều cao mesh (2 units)
  threshold: 15,          // switch tại 15 units
  hysteresis: 0.1,        // tránh flicker
})
scene.add(lodb.getLOD())

// 4. Không cần update thủ công — THREE.LOD.autoUpdate = true

// 5. Debug: xem level đang active
// 0 = mesh 3D, 1 = billboard sprite
const level = lodb.getCurrentLevel()

// 6. Cleanup
lodb.dispose()
billboardMap.dispose()  // caller tự dispose
geometry.dispose()      // caller tự dispose
material.dispose()      // caller tự dispose
```

## Billboard texture khuyến nghị

| Format | Kích thước | Ghi chú |
|--------|-----------|---------|
| PNG với alpha | 64×64 | Đủ cho crowd xa — nhỏ, nhanh |
| PNG với alpha | 128×128 | Nếu billboard visible rõ hơn |
| Canvas texture | 64×64 | Programmatic — không cần file |

**Tip:** Billboard nên có background transparent + hình dạng nhận biết được từ xa (silhouette rõ, màu nổi bật).

## Performance budget

| | Cost | Ghi chú |
|--|------|---------|
| 3D mesh | draw calls + triangles đầy đủ | Chỉ khi camera gần |
| Billboard sprite | 1 draw call, 2 triangles | Khi camera xa — rất rẻ |
| LOD update | Built-in renderer pass | autoUpdate = true, 0 CPU overhead |
| SpriteMaterial | WebGPU auto-upgrade → SpriteNodeMaterial | Transparent |

**Kịch bản crowd 100 character:**
- 10 character gần → 10 mesh draw calls
- 90 character xa → 90 sprite draw calls (2 tri mỗi cái vs 1000+ tri mỗi mesh)
- Tổng: 100 draw calls nhưng triangle count giảm ~90%

## Lỗi thường gặp

- ❌ **`billboardScale` quá nhỏ** → sprite nhỏ xíu khi switch → visible pop. Đặt scale xấp xỉ bounding box height của mesh.
- ❌ **`hysteresis = 0` với camera di chuyển chậm** → flicker tại boundary. Dùng 0.1 (±10%).
- ❌ **Dispose `billboardMap` trong `LODBillboard.dispose()`** → texture bị hủy khi nhiều instance dùng chung. Caller tự dispose.
- ❌ **Quên add LOD vào scene** → `scene.add(lodb.getLOD())`, không phải `scene.add(mesh)`.
- ❌ **`billboardMap` không có alpha channel** → sprite có background trắng/đen → nhìn sai. Dùng PNG transparent.
