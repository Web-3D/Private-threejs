# MetalPanel

Triplanar procedural corrugated metal panel shader. Phù hợp cho mái tôn, tường kho, nhà xưởng.

**Technique:**
- Corrugated ridges: `floor/fract(pv/ridgeH)` với sinusoidal crown profile
- Panel vertical seam: `step` tại cạnh phải mỗi panel
- Galvanized variation: `triNoise3D(panelIdx, ridgeIdx)` ±brightness nhỏ per panel
- Specular highlight: `profile²` tại đỉnh ridge
- Crease darkening: `smoothstep` groove tại chân mỗi ridge

## Usage

```typescript
import { MetalPanel } from 'threejs-modules/shaders/fragment/MetalPanel'

const metal = new MetalPanel({
  scale: 1.0,          // world-space scale
  ridgeH: 0.06,        // height per ridge (metres)
  ridgesPerPanel: 8,   // ridges per panel width
  variation: 0.06,     // galvanized brightness variation
})

mesh.material = metal.getMaterial()
```

## Options

| Option          | Type                   | Default                 | Description                              |
| --------------- | ---------------------- | ----------------------- | ---------------------------------------- |
| scale           | number                 | `1.0`                   | World-space scale                        |
| ridgeH          | number                 | `0.06`                  | Ridge height in scaled world units       |
| ridgesPerPanel  | number                 | `8`                     | Number of ridges per panel               |
| seamFrac        | number                 | `0.12`                  | Seam width as fraction of ridgeH         |
| ridgeProfile    | number                 | `0.70`                  | Crown fraction (0.5=sharp, 0.9=rounded)  |
| variation       | number                 | `0.06`                  | Per-panel brightness variation (0–0.15)  |
| metalColor      | THREE.ColorRepresentation | `0xb9bdbc` galvanized | Metal base colour                     |
| darkColor       | THREE.ColorRepresentation | `0x616161`            | Shadow/groove colour                  |
| seamColor       | THREE.ColorRepresentation | `0x383838`            | Panel seam colour                     |

## Runtime setters

```typescript
metal.setScale(1.5)
metal.setRidgeH(0.04)         // finer ridges
metal.setRidgesPerPanel(12)
metal.setVariation(0.10)      // more galvanized texture
metal.setMetalColor(0xa0a89c) // aged zinc
```

## Dispose

```typescript
metal.dispose()
```
