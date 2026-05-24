# BrickWall

Procedural brick wall material dùng world-space triplanar projection — không cần UV.

Thuật toán IQ-style: running bond brick grid → mortar `smoothstep` → per-brick colour variation via `triNoise3D`. Ba projection (XY / ZY / XZ) blend theo `normalWorld` để tự động bao phủ mọi face của mesh.

## Shadertoy Reference

Tune parameters visually trước khi adjust TSL — paste `shadertoy.glsl` vào [shadertoy.com/new](https://www.shadertoy.com/new).

## Usage

```typescript
import { BrickWall } from 'threejs-modules/shaders/fragment/BrickWall'

const brickWall = new BrickWall({
  brickW: 0.40,         // 40 cm — standard brick
  brickH: 0.20,
  mortar: 0.015,
  brickColor: 0xb86042, // terra cotta
  mortarColor: 0xc7c4be,
})

mesh.material = brickWall.getMaterial()
```

## Options

| Option | Type | Default | Description |
|---|---|---|---|
| `brickW` | `number` | `0.40` | Brick width in world units (m) |
| `brickH` | `number` | `0.20` | Brick height in world units |
| `mortar` | `number` | `0.015` | Mortar joint thickness |
| `variation` | `number` | `0.08` | Per-brick lightness variation [0–0.3] |
| `roughness` | `number` | `0.025` | Surface micro-roughness amplitude [0–0.15] |
| `blendSharpness` | `number` | `8.0` | Triplanar blend sharpness [1–20] |
| `brickColor` | `ColorRepresentation` | `0xb86042` | Brick base colour |
| `mortarColor` | `ColorRepresentation` | `0xc7c4be` | Mortar colour |

## Setters

Tất cả setter có validation + clamp — an toàn gọi trong animation loop.

```typescript
brickWall.setBrickW(0.35)          // narrower bricks
brickWall.setMortar(0.02)          // thicker joints
brickWall.setBrickColor(0x8b5e3c)  // darker reddish brick
brickWall.setBlendSharpness(12)    // crisper triplanar transitions
```

## Algorithm

```
positionWorld → 3× brickFace(px, py):
  su = px / (brickW + mortar)
  sv = py / (brickH + mortar)
  row = floor(sv)
  stagger = step(0.5, fract(row*0.5)) * 0.5   // running bond offset
  local = fract(staggered coords)
  minDist = min(dist_to_edge_x, dist_to_edge_y)
  isBrick = smoothstep(0, mortarFrac*2.5, minDist)
  variation = triNoise3D(cellId) * uVariation
  color = mix(mortarColor, brickColor + variation, isBrick)

normalWorld.abs() ^ blendSharpness → normalize → triplanar weights
output = colZY * wx + colXZ * wy + colXY * wz
```

## Performance

- ~3× triNoise3D calls per fragment (one per projection)
- Suitable for mid-distance buildings; use baked texture for very close-up
- `blendSharpness` nhỏ hơn = smooth transition = rẻ hơn một chút

## Dispose

```typescript
brickWall.dispose() // giải phóng NodeMaterial
// Không cần dispose texture — shader không dùng texture
```
