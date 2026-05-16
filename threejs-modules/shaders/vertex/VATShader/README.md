# VATShader

Vertex Animation Texture shader — đọc animation baked sẵn trong `DataTexture`, reconstruct vertex positions trên GPU. Zero CPU per-vertex per-frame sau khi texture đã bake.

## Khi nào dùng

| Dùng khi | Không dùng khi |
|----------|----------------|
| Crowd simulation (100+ character) | Animation phức tạp cần blend tree |
| Wind-blown vegetation (grass, tree) | Rigged character cần inverse kinematics |
| Destructible object pre-baked | Real-time physics simulation |
| Bất kỳ animation lặp lại nhiều instance | Animation không loop (cutscene) |

## Texture layout

```
DataTexture: width = vertexCount, height = frameCount
Pixel (x=vertexIndex, y=frameIndex) → RGB = position tại vertex đó, frame đó

Array layout (row-major):
  index = (frameIndex * vertexCount + vertexIndex) * 4  → RGBA
```

## Props

| Prop | Type | Default | Mô tả |
|------|------|---------|-------|
| `positionTexture` | `THREE.DataTexture` | — | RGBA + FloatType hoặc HalfFloatType, **bắt buộc** |
| `normalTexture` | `THREE.DataTexture` | `undefined` | Cùng dimensions, optional |
| `frameCount` | `number` | — | Tổng số frame baked, **bắt buộc** |
| `frameRate` | `number` | `24` | FPS playback |

## Usage

```ts
import * as THREE from 'three'
import { VATShader } from 'threejs-modules/shaders/VATShader'

// 1. Tạo DataTexture từ baked data (hoặc load từ file)
const vertCount = geometry.attributes.position.count
const frameCount = 30
const data = new Float32Array(vertCount * frameCount * 4)
// ... fill data ...

const posTexture = new THREE.DataTexture(data, vertCount, frameCount, THREE.RGBAFormat, THREE.FloatType)
posTexture.minFilter = THREE.NearestFilter
posTexture.magFilter = THREE.NearestFilter
posTexture.needsUpdate = true

// 2. Tạo VATShader
const vat = new VATShader({ positionTexture: posTexture, frameCount, frameRate: 24 })
const mesh = new THREE.Mesh(geometry, vat.getMaterial())
scene.add(mesh)

// 3. Animate
renderer.setAnimationLoop(() => {
  vat.update(clock.getElapsedTime())
  renderer.render(scene, camera)
})

// 4. Cleanup
vat.dispose()
posTexture.dispose()  // caller tự dispose texture
```

## Texture format khuyến nghị

| Format | Type | Dung lượng/vertex/frame | Khi nào dùng |
|--------|------|------------------------|--------------|
| `RGBAFormat` | `HalfFloatType` | 8 bytes | Character animation — đủ precision |
| `RGBAFormat` | `FloatType` | 16 bytes | Simulation cần precision cao |

## Performance budget

| | Cost | Ghi chú |
|--|------|---------|
| Texture sample/vertex/frame | ~1 texture lookup | Rẻ hơn skinning nhiều |
| CPU per frame | 1 uniform write | Chỉ update `uFrame` |
| Texture memory | `vertCount × frameCount × 8B` (HalfFloat) | 1000 verts × 60 frames = 480KB |

**So sánh với skinning:** VAT không cần bone matrix upload mỗi frame — static data trên GPU. Scales tốt với số lượng instance.

## Lỗi thường gặp

- ❌ **Texture filter LINEAR** → blur giữa vertex columns → vị trí sai. Phải dùng `NearestFilter`.
- ❌ **`needsUpdate = true` quên set** → texture không upload lên GPU → mesh không render.
- ❌ **width/height nhầm** → swap vertCount/frameCount → animation sai hoàn toàn. `width = vertCount`, `height = frameCount`.
- ❌ **Dispose positionTexture trong VATShader.dispose()** → texture bị hủy khi dùng lại cho mesh khác. Caller sở hữu texture.
- ❌ **Geometry vertex count không khớp texture width** → vertex đọc sai column → visual artifact.
