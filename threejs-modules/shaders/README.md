# shaders/

> NodeMaterial + TSL — mọi module đều return `NodeMaterial` qua `getMaterial()`, có `update(time)` và `dispose()`.

---

## Phân loại theo shader stage

```
shaders/
├── foundation/    ← building block — dùng bởi modules khác, ít dùng trực tiếp
├── vertex/        ← positionNode — vertex di chuyển, mesh biến dạng
└── fragment/      ← colorNode / opacityNode — màu sắc, texture, bề mặt
```

---

## foundation/

> Noise field, procedural base — nền tảng cho các vertex/fragment shader khác.

| Module | Mô tả | Complexity |
|---|---|---|
| `WorldNoise` | Animated 3D noise trong world space — base cho wind, fracture, weather | low |

---

## vertex/

> Ảnh hưởng `positionNode` — vertex bị đẩy khỏi vị trí gốc theo logic shader.

| Module | Mô tả | Complexity |
|---|---|---|
| `WindAnimation` | Vertex displacement giả lập gió — dùng `triNoise3D` cho foliage, grass | medium |
| `ProceduralFracture` | Vertex displacement dọc normal — vết nứt / fracture động | low |
| `VATShader` | Vertex Animation Texture — replay baked animation từ DataTexture trên GPU | high |

---

## fragment/

> Ảnh hưởng `colorNode` / `opacityNode` — bề mặt mesh, không dịch chuyển vertex.

| Module | Mô tả | Complexity |
|---|---|---|
| `TriplanarMapping` | Texture không cần UV — blend 3 mặt phẳng world-space | medium |
| `InteriorMapping` | Parallax room illusion qua cửa sổ tòa nhà | medium |
| `RoundedCorners` | SDF rounded rectangle trong UV space — áp lên PlaneGeometry | low |
| `DissolveShader` | Noise-based dissolve với edge glow — cinematic spawn/despawn | low |

---

## Interface chung (mọi module)

```typescript
const shader = new XyzShader(opts)
mesh.material = shader.getMaterial()

// animation loop:
shader.update(clock.getElapsedTime())

// cleanup:
shader.dispose()
```

---

## Thêm module mới

1. Xác định stage: `positionNode` ảnh hưởng → `vertex/` | `colorNode/opacityNode` → `fragment/` | building block → `foundation/`
2. Tạo folder `shaders/[stage]/[ModuleName]/`
3. Copy từ `_template/` trong category phù hợp
4. Cập nhật bảng tương ứng ở trên + bảng catalog trong `../README.md`
