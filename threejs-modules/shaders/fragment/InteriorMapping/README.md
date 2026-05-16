# InteriorMapping

Parallax interior room illusion cho building window. Áp dụng lên `PlaneGeometry` — nhìn qua "cửa sổ" thấy phòng bên trong với độ sâu giả lập. Dùng 1 texture thay cho hàng trăm mesh nội thất.

## Props

| Prop | Type | Default | Mô tả |
|---|---|---|---|
| `map` | `THREE.Texture` | — | Texture hình phòng nội thất. Caller sở hữu — không dispose trong class |
| `tiling` | `number` | `1` | Số cửa sổ trên mỗi UV unit (4 = grid 4×4) |
| `depth` | `number` | `0.5` | Độ sâu parallax — giá trị cao = phòng trông sâu hơn |

## Usage

```typescript
import * as THREE from 'three'
import { InteriorMapping } from './InteriorMapping'

const texture = new THREE.TextureLoader().load('room.jpg')
const interior = new InteriorMapping({ map: texture, tiling: 4, depth: 0.6 })

const geo = new THREE.PlaneGeometry(3, 3)
geo.computeTangents()  // bắt buộc — InteriorMapping cần tangent attribute
const mesh = new THREE.Mesh(geo, interior.getMaterial())
scene.add(mesh)
```

## Lưu ý kỹ thuật

- **Bắt buộc** gọi `geo.computeTangents()` — shader dùng `tangentWorld` + `bitangentWorld`
- `PlaneGeometry` đã có tangent mặc định, nhưng gọi `computeTangents()` để đảm bảo
- Texture nên là hình phòng chụp thẳng từ phía trước (không góc nghiêng)
- Mỗi room tile random flip ngang + offset dọc → tạo variation không cần atlas texture

## Runtime API

```typescript
interior.setDepth(0.8)   // tăng độ sâu parallax
interior.setTiling(6)    // nhiều cửa sổ hơn
```

## Texture guidelines

| Nội dung | Kết quả |
|---|---|
| Ảnh phòng tối, ánh đèn vàng | Cửa sổ nhà ban đêm |
| Ảnh văn phòng với cửa sổ nền | Tòa nhà văn phòng |
| Ảnh căn hộ | Building dân cư |

Texture 512×512 là đủ — không cần lớn hơn vì mỗi tile chỉ chiếm 1 phần nhỏ màn hình.
