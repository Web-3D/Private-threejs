# Weathering

Triplanar layered weathering shader. Blend 4 lớp mài mòn lên bất kỳ bề mặt nào — không cần UV.

**4 layers (từ dưới lên):**
1. **Moss** — `fbm * lowMask` → green patches tập trung ở vùng thấp, phía bắc
2. **Dirt streak** — `elongatedFbm(pu*1.5, pv*0.3)` → vệt bẩn chảy dọc từ trên xuống
3. **Rust** — `fbm` dense patches + bias ở vùng thấp → iron oxide orange
4. **Rain stain** — noise chỉ theo X → vertical streaks thẳng đứng

## Usage

```typescript
import { Weathering } from 'threejs-modules/shaders/fragment/Weathering'

const wear = new Weathering({
  baseColor: 0xd0c8b4,  // clean plaster
  mossAmt:  0.55,        // 0=none → 1=heavy
  dirtAmt:  0.45,
  rustAmt:  0.30,
  stainAmt: 0.35,
})

mesh.material = wear.getMaterial()
```

## Options

| Option     | Type                   | Default           | Description                        |
| ---------- | ---------------------- | ----------------- | ---------------------------------- |
| scale      | number                 | `1.0`             | World-space scale                  |
| baseColor  | THREE.ColorRepresentation | `0xd0c8b4`    | Clean surface colour               |
| mossColor  | THREE.ColorRepresentation | `0x476037`    | Moss green colour                  |
| dirtColor  | THREE.ColorRepresentation | `0x594733`    | Dirt/grime colour                  |
| rustColor  | THREE.ColorRepresentation | `0x9e4d1a`    | Rust orange colour                 |
| stainColor | THREE.ColorRepresentation | `0x99918f`    | Rain stain colour (usually lighter)|
| mossAmt    | number                 | `0.55`            | Moss layer intensity (0–1)         |
| dirtAmt    | number                 | `0.45`            | Dirt streak intensity (0–1)        |
| rustAmt    | number                 | `0.30`            | Rust patch intensity (0–1)         |
| stainAmt   | number                 | `0.35`            | Rain stain intensity (0–1)         |

## Runtime control

```typescript
// Fresh state
wear.setMossAmt(0.1)
wear.setDirtAmt(0.1)
wear.setRustAmt(0.0)
wear.setStainAmt(0.1)

// Abandoned building
wear.setMossAmt(0.9)
wear.setDirtAmt(0.8)
wear.setRustAmt(0.7)
wear.setStainAmt(0.6)
```

## Combine with surface shaders

Weathering works best on top of another shader via `MeshStandardMaterial.map` → but for now it's a standalone NodeMaterial. Planned: expose as `colorNode` fragment that can wrap any base color.

## Dispose

```typescript
wear.dispose()
```
