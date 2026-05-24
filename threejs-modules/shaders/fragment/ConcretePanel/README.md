# ConcretePanel

Procedural concrete panel material — world-space triplanar, no UV.

Panel seam grid (opRep regular grid) + 3-octave fbm pour variation + micro roughness. Dùng cho apartment, office, warehouse walls trong 01-Doraemon building system.

## Shadertoy Reference

Paste `shadertoy.glsl` vào [shadertoy.com/new](https://www.shadertoy.com/new) để tune params visually.

## Usage

```typescript
import { ConcretePanel } from 'threejs-modules/shaders/fragment/ConcretePanel'

const concrete = new ConcretePanel({
  panelW: 1.20,
  panelH: 2.40,
  seamW: 0.010,
  baseColor: 0xacaba4,
  seamColor: 0x706f6a,
})

mesh.material = concrete.getMaterial()
```

## Options

| Option | Type | Default | Description |
|---|---|---|---|
| `panelW` | `number` | `1.20` | Panel width in world units (m) |
| `panelH` | `number` | `2.40` | Panel height in world units |
| `seamW` | `number` | `0.010` | Seam joint width |
| `fbmAmp` | `number` | `0.055` | Surface fbm colour variation [0–0.2] |
| `roughness` | `number` | `0.018` | Micro-roughness amplitude [0–0.1] |
| `blendSharpness` | `number` | `8.0` | Triplanar blend sharpness [1–20] |
| `baseColor` | `ColorRepresentation` | `0xacaba4` | Concrete grey |
| `seamColor` | `ColorRepresentation` | `0x706f6a` | Seam groove dark grey |

## Algorithm

```
positionWorld → 3× concreteFace(px, py):
  su = px / panelW,  sv = py / panelH
  minDist = min(dist_to_edge_x, dist_to_edge_y)
  isPanel = smoothstep(0, seamFrac*2.5, minDist)   // 0=seam, 1=panel

  fbm = triNoise3D(p*0.9)*0.57 + triNoise3D(p*1.8)*0.28 + triNoise3D(p*3.6)*0.14
  fbmShift = (fbm - 0.5) * fbmAmp
  rough = triNoise3D(p*22) * roughness

  panelCol = baseColor + vec3(fbmShift + rough)
  color = mix(seamColor, panelCol, isPanel) * AO

normalWorld.abs() ^ blendSharpness → normalize → blend 3 faces
```

## Dispose

```typescript
concrete.dispose()
```
