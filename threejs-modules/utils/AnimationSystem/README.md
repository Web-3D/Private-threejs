# AnimationSystem

Wrap `THREE.AnimationMixer` với typed API cho play/pause/crossfade — dùng với glTF model có skeleton animation.

## Props

| Option | Type | Mô tả |
|---|---|---|
| `root` | `THREE.Object3D` | Root object chứa skeleton — thường là `gltf.scene` |
| `clips` | `THREE.AnimationClip[]` | Danh sách clips — thường là `gltf.animations` |

## API

| Method | Mô tả |
|---|---|
| `play(name, opts?)` | Chạy clip ngay, stop clip trước |
| `crossFade(name, duration?, opts?)` | Transition mềm từ clip hiện tại |
| `pause()` | Tạm dừng |
| `resume()` | Tiếp tục |
| `stop()` | Dừng hoàn toàn |
| `update(delta)` | Gọi mỗi frame — delta = giây từ frame trước |
| `getClipNames()` | Danh sách tên clip có sẵn |
| `dispose()` | Cleanup mixer + cache |

## PlayOptions

```ts
interface PlayOptions {
  loop?: boolean              // default: true
  fadeIn?: number             // fade-in duration (giây), default: 0
  clampWhenFinished?: boolean // dừng ở frame cuối khi LoopOnce, default: false
}
```

## Usage với GLTFLoader

```ts
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js'
import { AnimationSystem } from 'threejs-modules/utils/AnimationSystem'

const loader = new GLTFLoader()
const gltf = await loader.loadAsync('/models/character.glb')
scene.add(gltf.scene)

const anim = new AnimationSystem({
  root: gltf.scene,
  clips: gltf.animations,  // ['Idle', 'Walk', 'Run', 'Jump', ...]
})

// Play clip
anim.play('Idle')

// Crossfade sang Walk khi nhân vật bắt đầu di chuyển
anim.crossFade('Walk', 0.3)

// Trong animation loop
const clock = new THREE.Clock()
function animate() {
  anim.update(clock.getDelta())
  renderer.render(scene, camera)
}

// Cleanup
anim.dispose()
```

## Ghi chú

- `crossFade()` dùng `THREE.AnimationAction.crossFadeTo()` với warp=true → smooth kể cả khi 2 clip có speed khác nhau.
- Nếu clip name không tồn tại → console.warn + danh sách clip có sẵn (không throw).
- `dispose()` gọi `uncacheRoot()` để giải phóng cache nội bộ của mixer — quan trọng nếu load/unload model nhiều lần.
