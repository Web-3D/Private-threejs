# RoofTileJP

Procedural Japanese kawara (瓦) roof tile material — world-space triplanar, no UV.

Running bond tile grid + `sdRoundBox2D` rounded corners + cosine S-profile ridge shading. Dùng cho gabled / hip / shed roofs trong 01-Doraemon building system.

## Shadertoy Reference

Paste `shadertoy.glsl` vào [shadertoy.com/new](https://www.shadertoy.com/new) để tune tile dimensions và colours visually.

## Usage

```typescript
import { RoofTileJP } from 'threejs-modules/shaders/fragment/RoofTileJP'

const roofTile = new RoofTileJP({
  tileW: 0.28,
  tileH: 0.34,
  gap: 0.008,
  tileColor: 0x383839,  // dark charcoal kawara
})

roofMesh.material = roofTile.getMaterial()
```

## Options

| Option | Type | Default | Description |
|---|---|---|---|
| `tileW` | `number` | `0.28` | Tile width in world units (m) |
| `tileH` | `number` | `0.34` | Tile height along roof slope |
| `gap` | `number` | `0.008` | Gap between tiles |
| `blendSharpness` | `number` | `8.0` | Triplanar blend sharpness [1–20] |
| `tileColor` | `ColorRepresentation` | `0x383839` | Tile face (dark charcoal) |
| `ridgeColor` | `ColorRepresentation` | `0x464647` | Ridge highlight |
| `gapColor` | `ColorRepresentation` | `0x1e1d1d` | Gap / shadow |

## Algorithm

```
positionWorld → 3× tileFace(px, py):
  row = floor(py / cellH)
  stagger = step(0.5, fract(row*0.5)) * tileW*0.5   // running bond

  local = fract(staggered tile coords)
  inGap = smoothstep(0, gapFrac*2.5, minEdgeDist)

  sdRoundBox2D(local-0.5, halfExt, 0.06) → outsideTile
  isTile = inGap * (1 - outsideTile)

  S-profile: ridgeLight = cos(localU * PI)^2
  tileCol = mix(ridgeColor, tileColor, ridgeLight) + triNoise3D variation
  color = mix(gapColor, tileCol, isTile) * AO

normalWorld.abs() ^ blendSharpness → triplanar weights
```

## Dispose

```typescript
roofTile.dispose()
```
