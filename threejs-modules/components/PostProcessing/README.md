# PostProcessing

WebGPU post-processing pipeline — wraps Three.js `PostProcessing` class với bloom effect. Thay thế `renderer.render(scene, camera)` bằng `pp.render()` để scene đi qua pipeline: scene pass → bloom → tone mapping → output.

## Khi nào dùng

| Dùng khi | Không dùng khi |
|----------|----------------|
| Emissive objects cần glow rõ | Simple scene không có bloom |
| HDR rendering cần tone mapping | Performance-critical mobile target |
| Cinematic look với bright highlights | Scene không có bright emissive areas |

## Props

| Prop | Type | Default | Mô tả |
|------|------|---------|-------|
| `renderer` | `WebGPURenderer` | — | **Bắt buộc** — renderer đang dùng |
| `scene` | `THREE.Scene` | — | **Bắt buộc** |
| `camera` | `THREE.Camera` | — | **Bắt buộc** |
| `bloomStrength` | `number` | `1.2` | Bloom intensity [0–3] |
| `bloomRadius` | `number` | `0.4` | Bloom blur radius |
| `bloomThreshold` | `number` | `0.85` | Brightness threshold để bloom [0–1] |

## Usage

```ts
import { PostProcessingManager } from 'threejs-modules/components/PostProcessing'

// 1. Tạo sau renderer.init()
const pp = new PostProcessingManager({
  renderer,
  scene,
  camera,
  bloomStrength: 1.5,
  bloomThreshold: 0.8,
})

// 2. Animation loop — KHÔNG gọi renderer.render() nữa
renderer.setAnimationLoop(() => {
  pp.render()  // thay thế renderer.render(scene, camera)
})

// 3. Cleanup
pp.dispose()
```

## Bloom hoạt động tốt nhất với

```ts
// Emissive material với intensity > 1 — vượt ngưỡng threshold
const mat = new THREE.MeshStandardMaterial({
  emissive: new THREE.Color(0xff4444),
  emissiveIntensity: 2.5,  // > 1 = bloom hiển thị rõ
})
```

## Thêm effects

PostProcessing pipeline có thể chain nhiều effects. Import từ `three/addons/tsl/display/`:

```ts
// Sau khi hiểu cơ bản, có thể tự build pipeline
import { pass } from 'three/src/nodes/display/PassNode.js'
import { bloom } from 'three/addons/tsl/display/BloomNode.js'
import { fxaa } from 'three/addons/tsl/display/FXAANode.js'
import { PostProcessing } from 'three/webgpu'

const scenePass = pass(scene, camera)
const bloomEffect = bloom(scenePass, 1.5, 0.4, 0.85)
// Thêm FXAA anti-aliasing:
// const fxaaEffect = fxaa(bloomEffect)
// pp.outputNode = fxaaEffect
```

Danh sách effects trong `three/addons/tsl/display/`:
- `BloomNode` — bloom glow
- `FXAANode` — fast anti-aliasing  
- `GTAONode` — ambient occlusion
- `FilmNode` — film grain
- `DenoiseNode` — AI denoise
- `GaussianBlurNode` — gaussian blur
- `DepthOfFieldNode` — depth of field
- `AfterImageNode` — motion blur / afterimage

## Performance budget

| Operation | Cost |
|-----------|------|
| Scene pass | Normal render cost + RenderTarget |
| Bloom pass | 5-7 blur passes × resolution |
| Output pass | 1 fullscreen quad |
| Total overhead | ~1.5× normal render time |

## Lỗi thường gặp

- ❌ **Vừa gọi `renderer.render()` vừa `pp.render()`** → double render, performance waste và visual glitch
- ❌ **Bloom không thấy được** → `bloomThreshold` quá cao hoặc emissiveIntensity quá thấp. Thử giảm threshold xuống 0.5 và tăng emissiveIntensity lên 3.0
- ❌ **Gọi trước `renderer.init()`** → PostProcessing cần renderer đã khởi tạo hoàn toàn (await renderer.init() trước)
