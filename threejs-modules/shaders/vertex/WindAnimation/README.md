# WindAnimation

Vertex displacement shader giả lập gió dùng `triNoise3D` — cùng kỹ thuật với `WorldNoise` nhưng áp dụng vào `positionNode` thay vì `colorNode`. Zero CPU per-vertex, hoàn toàn GPU.

## Khi nào dùng

| Dùng khi | Không dùng khi |
|----------|----------------|
| Cây, cỏ, lá cần đung đưa | Rigid body không cần sway |
| Flag, vải, curtain | Character animation (dùng VATShader) |
| Grass field, bushes | Object có UV animation sẵn |
| Geometry với nhiều vertex | Single quad (displacement không rõ) |

## Props

| Prop | Type | Default | Mô tả |
|------|------|---------|-------|
| `strength` | `number` | `0.3` | Biên độ displacement (world units) |
| `frequency` | `number` | `0.8` | Tần số không gian — lớn hơn = gió rối hơn |
| `speed` | `number` | `1.0` | Tốc độ animation |
| `baseColor` | `THREE.ColorRepresentation` | `0x44aa44` | Màu flat của material |

## Usage

```ts
import { WindAnimation } from 'threejs-modules/shaders/WindAnimation'

const wind = new WindAnimation({ strength: 0.25, frequency: 0.6, baseColor: 0x3a7d44 })

// Apply to mesh — shared material, consistent sway
const geo = new THREE.PlaneGeometry(8, 6, 40, 30)
geo.rotateX(-Math.PI / 2)
const grass = new THREE.Mesh(geo, wind.getMaterial())
scene.add(grass)

// Also apply to other meshes — shared material
scene.add(new THREE.Mesh(stalkGeo, wind.getMaterial()))

// Animation loop
renderer.setAnimationLoop(() => {
  wind.update(clock.getElapsedTime())
  renderer.render(scene, camera)
})

// Cleanup
wind.dispose()
geo.dispose()
```

## Để PBR lighting hoạt động

`WindAnimation` dùng `NodeMaterial` base — colorNode = unlit flat color. Để có lighting phản ứng với DirectionalLight:

```ts
import { MeshStandardNodeMaterial } from 'three/webgpu'
// Thay vì getMaterial(), tự tạo material:
const mat = new MeshStandardNodeMaterial()
mat.color = new THREE.Color(0x3a7d44)  // albedo
mat.roughness = 0.8
mat.positionNode = wind.getPositionNode() // TODO: expose method nếu cần
```

Hoặc override colorNode với texture:
```ts
const mat = wind.getMaterial()
mat.colorNode = texture(grassTexture)  // albedo từ texture
```

## Performance budget

| Operation | Cost |
|-----------|------|
| Vertex shader | 2 × triNoise3D sample/vertex (4× nesting) |
| CPU per frame | 1 float uniform write — O(1) |
| GPU memory | 0 extra — chỉ uniforms |

**Lưu ý segments:** Để displacement rõ ràng, geometry cần đủ subdivisions. `PlaneGeometry(8, 6, 40, 30)` → 1271 vertices → displacement rõ. `PlaneGeometry(8, 6, 1, 1)` → 4 vertices → displacement không rõ.

## Lỗi thường gặp

- ❌ **Quên gọi `wind.update(t)`** → displacement đứng yên — tạo hiệu ứng freeze cứng, không phải static
- ❌ **`strength` quá lớn (> 2.0)** → mesh distort mạnh, geometry explode visually
- ❌ **Geometry ít vertex** → displacement không rõ, cần tăng segments
- ❌ **`positionWorld` thay vì `positionLocal` trong positionNode** → circular dependency với model matrix
