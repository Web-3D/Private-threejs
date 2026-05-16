# OutlineShader

Per-object outline via BackSide scaled mesh — không cần post-processing. Tự thêm outline làm child của sourceMesh → tự follow transform.

## Props

| Prop | Type | Default | Mô tả |
|---|---|---|---|
| `color` | `ColorRepresentation` | `0x00ffff` | Màu viền |
| `thickness` | `number` | `0.03` | Scale delta — 0.03 = mesh scale lên 1.03 |

## Usage

```typescript
import { OutlineShader } from './OutlineShader'

const outline = new OutlineShader(targetMesh, { color: 0x00ffcc, thickness: 0.04 })

// Không cần add gì thêm — outline đã được add vào targetMesh.children
// Để ẩn outline:
outline.setVisible(false)
// Để highlight khi hover:
outline.setColor(0xffff00)
// Cleanup khi done:
outline.dispose()
```

## Runtime API

```typescript
outline.setColor(0xffaa00)     // đổi màu outline
outline.setThickness(0.06)    // đổi độ dày
outline.setVisible(false)     // ẩn/hiện
outline.dispose()             // remove khỏi parent + cleanup material
```

## Cách hoạt động

1. Clone geometry của `sourceMesh` (shared — không copy data)
2. Apply `THREE.BackSide` material → chỉ render mặt trong
3. Scale lên `1 + thickness` → BackSide faces lộ ra ngoài bề mặt gốc = viền

## Giới hạn

| Giới hạn | Giải thích |
|---|---|
| Visible through mesh | BackSide bị cắt bởi stencil buffer khi camera đi vào trong mesh |
| Non-uniform scale artifacts | Scale đều (setScalar) → outline không đều nếu source mesh đã có non-uniform scale |
| Outline không đẹp ở cạnh sắc | Phù hợp cho rounded mesh (sphere, capsule, smooth character). Cạnh góc cứng → dùng OutlinePass |

Khi nào dùng **OutlinePass** thay thế:
- Cần edge detection chính xác (cạnh sắc, tòa nhà)
- Cần glow effect (blur + composite)
- Nhiều objects cùng lúc cùng style

## So sánh

| | OutlineShader | OutlinePass |
|---|---|---|
| Setup | 1 dòng, per-object | Cần PostProcessing pipeline |
| Performance | ~1 draw call thêm/mesh | 1 full-screen pass |
| Quality | Đủ cho rounded mesh | Tốt hơn với cạnh sắc |
| Glow | Không | Có |
