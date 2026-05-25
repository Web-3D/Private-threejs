# future-shaders — GlassShader · DissolveShader · OutlineShader

> Module shaders tiếp theo — chờ có scene thực tế để xác định priority.
> Revisit khi: bắt đầu tích hợp modules vào `00-Threejs/src/world/`

---

## GlassShader

**Mục đích:** Material cho cửa sổ kính, vật liệu trong suốt — refraction + transmission + Fresnel.

**Category:** `shaders/` | **Complexity:** medium-high

### Hai hướng implement

**Option A — MeshPhysicalMaterial (khuyến nghị trước)**
Three.js 0.174 có sẵn `MeshPhysicalMaterial` với `transmission`, `ior`, `thickness`, `roughness`:
```typescript
const glass = new THREE.MeshPhysicalMaterial({
  transmission: 1.0,   // 0 = opaque, 1 = fully transmissive
  ior: 1.5,            // index of refraction (glass = 1.5, water = 1.33)
  thickness: 0.5,      // world-space thickness → tint depth
  roughness: 0.0,      // 0 = perfect mirror
  metalness: 0.0,
})
```
Yêu cầu: `renderer.capabilities.isWebGL2 = true` và `renderer.physicallyCorrectLights = true`.

**Option B — NodeMaterial + TSL (khi cần stylized)**
Dùng khi cần tint màu, animated distortion, hoặc performance-friendly (không cần full PBR pipeline):
```typescript
// refraction bằng cách sample envmap với normal distortion
const refractedDir = normalWorld.negate().mix(normalWorld, uniform(0.1))
material.colorNode = envMap.sample(refractedDir).mul(tintColor)
```

### Fresnel
```typescript
// Fresnel — rim sáng hơn ở góc nhìn ngang
const fresnel = float(1).sub(normalView.dot(positionViewDirection).abs()).pow(float(3))
material.colorNode = baseColor.add(fresnelColor.mul(fresnel))
```

### Deps
- `GlobalUniforms` nếu có animated distortion (dùng `uTime`)
- Không cần deps nếu dùng `MeshPhysicalMaterial`

### Revisit khi
- Có building/interior scene cần cửa sổ kính
- `InteriorMapping` + GlassShader = combo window hoàn chỉnh

---

## DissolveShader

**Mục đích:** Noise-based dissolve effect — spawn/despawn cinematic, death animation, teleport.

**Category:** `shaders/` | **Complexity:** low

### Core formula

```glsl
// Fragment: clip pixel nếu noise < threshold
float n = triNoise3D(worldPos * uScale, 0.5, uTime);
if (n < uDissolve) discard;

// Edge glow: pixels sát threshold → emit color
float edge = smoothstep(uDissolve, uDissolve + 0.05, n);
outColor = mix(uEdgeColor, baseColor, edge);
```

### TSL implementation

```typescript
import { triNoise3D, positionWorld, uniform, smoothstep, mix, color } from 'three/tsl'

const uDissolve   = uniform(0.0)   // 0 = full object, 1 = fully dissolved
const uEdgeColor  = uniform(color(0x00ffff))
const uScale      = uniform(2.0)

const noise = triNoise3D(positionWorld.mul(uScale), float(0.5), uTime)
const edge  = smoothstep(uDissolve, uDissolve.add(float(0.08)), noise)

material.colorNode  = mix(uEdgeColor, baseColorNode, edge)
material.opacityNode = step(uDissolve, noise)  // hard clip
material.transparent = true
```

### API cần có

```typescript
class DissolveShader {
  dissolveIn(duration: number): void   // animate 1 → 0 (appear)
  dissolveOut(duration: number): void  // animate 0 → 1 (disappear)
  setEdgeColor(hex: number): void
  setScale(value: number): void
}
```

### Lưu ý
- `WorldNoise` module cung cấp `triNoise3D` — import từ đó, không duplicate
- Depth write nên tắt khi `uDissolve > 0` (transparent fragments vẫn viết depth → artifact)
- Kết hợp với `SparkSystem` đặt ở emitter position → sparks bay ra lúc dissolve

### Deps
- `WorldNoise` (hoặc inline `triNoise3D` — xem verify)
- `GlobalUniforms` (`uTime`)

---

## OutlineShader

**Mục đích:** Highlight object đang được select/target — viền phát sáng.

**Category:** `shaders/` hoặc `components/` tùy approach | **Complexity:** low-medium

### Hai approach

**Approach A — Stencil outline (per-object, khuyến nghị)**
Render object 2 lần: lần 1 ghi stencil, lần 2 scale lên nhỏ + đổi màu + stencil test:
```typescript
// Pass 1: fill stencil
mesh.material.stencilWrite = true
mesh.material.stencilRef   = 1
mesh.material.stencilFunc  = THREE.AlwaysStencilFunc

// Pass 2: outline mesh (scale up slightly, render back faces only)
const outlineMesh = mesh.clone()
outlineMesh.material = new THREE.MeshBasicMaterial({
  color: 0x00ffff,
  side: THREE.BackSide,
})
outlineMesh.scale.multiplyScalar(1.03)
```
Ưu điểm: không cần post-processing, không ảnh hưởng các object khác.

**Approach B — OutlinePass (post-processing)**
Three.js có sẵn `OutlinePass` trong `three/examples/jsm/postprocessing/`:
```typescript
import { OutlinePass } from 'three/examples/jsm/postprocessing/OutlinePass.js'

const outlinePass = new OutlinePass(
  new THREE.Vector2(width, height),
  scene, camera
)
outlinePass.selectedObjects = [targetMesh]
outlinePass.edgeStrength  = 3.0
outlinePass.edgeGlow      = 0.5
outlinePass.visibleEdgeColor.set(0x00ffff)
```
Ưu điểm: đẹp hơn, có glow. Nhược: thêm render pass → cần tích hợp với `PostProcessing` module.

### Revisit khi
- Có game mechanic cần highlight target (hover, select, lock-on)
- Approach A đủ cho simple case — Approach B khi cần glow effect

### Deps
- Approach B: `PostProcessing` module (thêm OutlinePass vào composer)
