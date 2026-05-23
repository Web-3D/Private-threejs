# AudioSystem

Spatial audio manager cho Three.js — wrap `AudioListener` + `PositionalAudio` + `AudioLoader`. Play positional SFX tại bất kỳ world position nào; volume và pan tự động tính theo khoảng cách từ camera.

Tích hợp tự nhiên với `CollisionEventBus.onImpact`: `audio.play('crash', e.position)`.

## Usage

```typescript
import { AudioSystem } from 'threejs-modules'

// Khởi tạo
const audio = new AudioSystem({ refDistance: 2, maxDistance: 20 })
camera.add(audio.getListener())   // listener PHẢI gắn vào camera
scene.add(audio.getRoot())        // root PHẢI ở trong scene

// Load sound files
await audio.load('crash', '/sounds/crash.ogg')
await audio.load('ambient', '/sounds/wind.ogg')

// Bật audio sau user gesture (browser policy)
canvas.addEventListener('click', () => audio.resume(), { once: true })

// Play
audio.play('crash', { x: 1, y: 0, z: -3 })   // positional — pan + volume theo khoảng cách
audio.play('ambient')                          // global — nghe ở mọi nơi như nhau
audio.play('crash', e.position, 0.8)          // với custom volume

// Master volume
audio.setMasterVolume(0.5)

// Cleanup
audio.dispose()
```

## Tích hợp với CollisionEventBus

```typescript
bus.register({
  colliderHandle: wallBody.getCollider().handle,
  threshold: 50,
  onImpact: (e) => {
    audio.play('crash', e.position)             // spatial impact sound
    vatShader.play('wall_break', e.position)    // VAT animation
    particles.spawn(e.position)                 // particle burst
  }
})
```

## Options

| Option | Type | Default | Mô tả |
|--------|------|---------|-------|
| `refDistance` | `number` | `1` | Khoảng cách (units) tại đó volume = 100% |
| `rolloffFactor` | `number` | `1` | Tốc độ giảm volume khi ra xa |
| `maxDistance` | `number` | `100` | Khoảng cách tối đa — xa hơn volume = 0 |

## Methods

| Method | Mô tả |
|--------|-------|
| `getListener()` | Trả về `AudioListener` để `camera.add()` |
| `getRoot()` | Trả về root `Object3D` để `scene.add()` |
| `load(name, url)` | Load + cache audio file từ URL |
| `addBuffer(name, buffer)` | Inject `AudioBuffer` programmatically (test, procedural) |
| `resume()` | Resume `AudioContext` — gọi từ user gesture handler |
| `play(name, position?, volume?)` | Play sound (positional nếu có position) |
| `setMasterVolume(value)` | Master volume 0.0–1.0 |
| `getMasterVolume()` | Đọc master volume hiện tại |
| `dispose()` | Stop tất cả sounds, clear cache, disconnect graph |

## Notes

- **User gesture bắt buộc:** Browser chặn audio trước khi user click/touch. Gọi `audio.resume()` từ click handler.
- **Thứ tự setup:** `camera.add(listener)` → `scene.add(root)` → gọi `play()` — thiếu 1 trong 2 bước add thì spatial audio không hoạt động đúng.
- **One-shot:** Mỗi `play()` tạo `AudioNode` mới, tự cleanup sau khi kết thúc. Không cần track thủ công.
- **`addBuffer()`:** Dùng khi muốn generate sound procedurally mà không cần asset file — ví dụ tone generation qua Web Audio API.
- **HRTF panning:** Three.js `PositionalAudio` dùng `PannerNode` với model `HRTF` — binaural pan thực tế, không chỉ L/R stereo.

## Dispose

```typescript
audio.dispose()
// Stops tất cả active PositionalAudio
// Disconnect Web Audio graph (gain + panner nodes)
// Clear buffer cache
// Remove listener khỏi camera, root khỏi scene
```
