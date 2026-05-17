# BillboardSprite

Sprite luôn quay về camera. Dùng cho icon, marker, health indicator, glow effect. Extends `BaseGPUEffect`.

## Cách dùng

```typescript
import { BillboardSprite } from 'threejs-modules/effects/BillboardSprite'

const sprite = new BillboardSprite({ map: texture, size: 0.5, color: 0xffaa00, additive: true })
scene.add(sprite.root)

// Mỗi frame — sau khi camera cập nhật vị trí:
sprite.update(camera)

// Ẩn tạm:
sprite.setVisible(false)

// Xong hẳn:
sprite.dispose()  // texture KHÔNG bị dispose — caller sở hữu
```

## API

| Prop / Method | Mô tả |
|---|---|
| `root` | `THREE.Mesh` — add vào scene |
| `update(camera)` | Align về camera. Gọi mỗi frame sau khi camera di chuyển |
| `setOpacity(0–1)` | Thay đổi opacity runtime |
| `setColor(color)` | Thay đổi tint color runtime |
| `setVisible(bool)` | Toggle (từ BaseGPUEffect) |
| `dispose()` | Dispose geo + mat. Texture do caller dispose |

## Options

| Option | Type | Default | Mô tả |
|---|---|---|---|
| `map` | `THREE.Texture` | `null` | Texture (caller sở hữu) |
| `size` | `number` | `1.0` | Cạnh sprite (world units) |
| `color` | `ColorRepresentation` | `0xffffff` | Tint |
| `opacity` | `number` | `1.0` | Opacity 0–1 |
| `additive` | `boolean` | `false` | Additive blending cho glow |

## Texture ownership

`BillboardSprite` **không** dispose `opts.map`. Caller tạo texture → caller dispose:

```typescript
const tex = new THREE.TextureLoader().load('icon.png')
const sprite = new BillboardSprite({ map: tex })
// Khi xong:
sprite.dispose()  // dispose geo + mat
tex.dispose()     // caller dispose texture
```

## Thứ tự update quan trọng

```typescript
// ✅ Đúng — update camera trước, rồi update sprite
camera.position.set(x, y, z)
camera.lookAt(target)
sprite.update(camera)

// ❌ Sai — sprite dùng quaternion cũ của camera
sprite.update(camera)
camera.position.set(x, y, z)
```
