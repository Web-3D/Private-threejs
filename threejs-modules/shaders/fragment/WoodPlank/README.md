# WoodPlank

Triplanar procedural wood plank shader. Tạo bề mặt gỗ ván (siding, flooring, fence) không cần UV.

**Technique:**
- Plank rows: `floor(y / totalH)` với seam gap ở biên trên
- Grain: 2-octave `triNoise3D` chạy theo X axis (dọc thớ gỗ)
- End-grain darkening: `smoothstep` tối dần ở 2 cạnh mỗi ván
- Per-row hue shift: `hash(rowIdx)` ±0.06 để ván không đều màu
- X stagger: mỗi row dịch X ngẫu nhiên (boards don't line up)

## Usage

```typescript
import { WoodPlank } from 'threejs-modules/shaders/fragment/WoodPlank'

const wood = new WoodPlank({
  scale: 1.5,        // world-space scale (larger = denser planks)
  plankH: 0.14,      // plank height in scaled units (0.05–0.5)
  seamFrac: 0.08,    // seam as fraction of plankH (0.02–0.15)
  grainAmp: 0.22,    // grain noise strength (0–1)
})

mesh.material = wood.getMaterial()
```

## Options

| Option     | Type          | Default                    | Description                         |
| ---------- | ------------- | -------------------------- | ----------------------------------- |
| scale      | number        | `1.0`                      | World-space texture scale           |
| plankH     | number        | `0.14`                     | Plank height in scaled world units  |
| seamFrac   | number        | `0.08`                     | Seam gap as fraction of plankH      |
| grainAmp   | number        | `0.22`                     | Grain noise amplitude (0–1)         |
| woodColor  | THREE.Color   | `rgb(0.72, 0.52, 0.30)`    | Base wood colour (light tone)       |
| darkColor  | THREE.Color   | `rgb(0.38, 0.24, 0.12)`    | Dark vein / end-grain colour        |
| seamColor  | THREE.Color   | `rgb(0.18, 0.12, 0.08)`    | Seam crack colour                   |

## Runtime setters

```typescript
wood.setScale(2.0)     // rescale without rebuild
wood.setPlankH(0.10)   // thinner planks
wood.setGrainAmp(0.3)  // more pronounced grain
```

## Triplanar projections

| Face | Projection | Best for     |
| ---- | ---------- | ------------ |
| X    | ZY plane   | side walls   |
| Y    | XZ plane   | floor/roof   |
| Z    | XY plane   | front walls  |

## Dispose

```typescript
wood.dispose() // giải phóng NodeMaterial (THREE.Texture nếu có — caller owns)
```
