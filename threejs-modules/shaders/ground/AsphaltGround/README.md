# AsphaltGround

Vật liệu **đường nhựa / hắc ín procedural** (đen, nhám, hạt) cho ground plane — world-space XZ, không UV, không texture. Nhóm `shaders/ground/`.

Cùng interface wall shaders → ArchPlanLab dùng chung (getMaterial / getNormalNode / getRoughnessNode / dispose).

## Đặc điểm

- **Nền tar đen** + **mảng mòn** (fbm tần số thấp) — vệt bánh xe đánh bóng sáng xen tar mới tối.
- **Cốt liệu đá xám** rải (noise threshold) + **grain tiêu** li ti → bề mặt nhám hạt đúng chất nhựa đường.
- **Normal screen-space + LOD** — hạt cốt liệu fade ở xa (chống lấp lánh).
- **Roughness** cao matte (tar ~0.88), đá cốt liệu hơi bóng hơn (~0.65).

## Usage

```typescript
import { AsphaltGround } from 'threejs-modules/shaders/ground/AsphaltGround'

const asphalt = new AsphaltGround({ scale: 1.0 })
const road = new THREE.Mesh(new THREE.PlaneGeometry(80, 80), asphalt.getMaterial())
road.rotation.x = -Math.PI / 2
road.receiveShadow = true
scene.add(road)
```

Gợi ý lighting: `HemisphereLight.groundColor` ≈ xám tối (`0x26262a`) → bounce yếu (nhựa hấp thụ sáng).

## Options

| Option | Type | Default | Description |
| ------ | ---- | ------- | ----------- |
| scale | number | 1.0 | World-space scale |
| baseColor | ColorRepresentation | 0x1b1b1e | Màu tar nền |
| aggColor | ColorRepresentation | 0x57575c | Màu cốt liệu đá |
| aggScale | number | 30 | Tần số cốt liệu (1/m) |
| aggDensity | number | 0.45 | Mật độ đá lộ [0–1] |
| wear | number | 0.35 | Biên độ mảng mòn [0–1] |
| bumpScale | number | 0.5 | Cường độ normal |

## Dispose

```typescript
asphalt.dispose()
```
