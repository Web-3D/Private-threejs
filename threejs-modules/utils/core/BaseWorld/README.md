# BaseWorld

Abstract base class cho mọi demo scene trong `threejs-modules/*/example.ts`. Gom toàn bộ boilerplate (WebGPURenderer, Scene, Camera, ResizeObserver, animation loop) vào một extend — `createDemo` giảm từ ~40 dòng xuống 3 dòng.

## So sánh trước/sau

**Trước** (mỗi example.ts tự lặp):
```typescript
export async function createDemo(canvas) {
  const w = canvas.clientWidth || 300
  const h = canvas.clientHeight || 200
  const renderer = new WebGPURenderer({ canvas, antialias: true })
  renderer.setPixelRatio(1)
  renderer.setSize(w, h)
  await renderer.init()
  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(60, w / h, 0.1, 1000)
  // ... thêm objects ...
  const clock = new THREE.Clock()
  renderer.setAnimationLoop(() => {
    const t = clock.getElapsedTime()
    // ... update ...
    renderer.render(scene, camera)
  })
  return {
    dispose() {
      renderer.setAnimationLoop(null)
      // ... dispose objects ...
      renderer.dispose()
    }
  }
}
```

**Sau** (extend BaseWorld):
```typescript
class MyDemo extends BaseWorld {
  protected async onInit(): Promise<void> { /* setup */ }
  protected onUpdate(time: number, deltaTime: number): void { /* animate */ }
  protected onDispose(): void { /* cleanup */ }
}

export async function createDemo(canvas: HTMLCanvasElement) {
  const demo = new MyDemo(canvas)
  await demo.init()
  return { dispose: () => demo.dispose() }
}
```

## Cách extend đầy đủ

```typescript
import * as THREE from 'three'
import { BaseWorld } from 'threejs-modules/utils/BaseWorld'
import { MyEffect } from './index'

class MyEffectDemo extends BaseWorld {
  private effect: MyEffect | null = null

  protected async onInit(): Promise<void> {
    // this.renderer, this.scene, this.camera đã sẵn sàng
    this.scene.background = new THREE.Color(0x111111)
    this.camera.position.set(0, 2, 6)
    this.camera.lookAt(0, 0, 0)

    this.effect = new MyEffect({ count: 200 })
    this.scene.add(this.effect.root)
  }

  protected onUpdate(time: number, deltaTime: number): void {
    // time = tổng giây từ khi bắt đầu
    // deltaTime = giây kể từ frame trước (dùng cho physics)
    this.effect?.update(time)
  }

  protected onDispose(): void {
    this.effect?.dispose()
  }
}
```

## API

| Method / Field | Scope | Mô tả |
|---|---|---|
| `protected renderer` | subclass | WebGPURenderer — đã init |
| `protected scene` | subclass | THREE.Scene |
| `protected camera` | subclass | PerspectiveCamera 60° FOV |
| `protected abstract onInit()` | subclass | Setup scene, async OK |
| `protected abstract onUpdate(time, dt)` | subclass | Animate — mỗi frame |
| `protected onDispose()` | subclass (optional) | Cleanup objects, default no-op |
| `async init()` | public | Khởi động renderer + loop. Gọi sau constructor |
| `dispose()` | public | Dừng loop + cleanup |

## Camera defaults

```
FOV: 60°  |  Near: 0.1  |  Far: 1000
```

Override trong `onInit()`: `this.camera.position.set(...)`, `this.camera.fov = 45`, v.v.

## deltaTime vs time

- `time` — `getElapsedTime()`: total giây từ init. Dùng cho animation phase, sin/cos cycle.
- `deltaTime` — giây kể từ frame trước (~0.016s ở 60fps). Dùng cho physics, velocity.

```typescript
// time: phase animation
this.mesh.rotation.y = time * 0.5

// deltaTime: frame-rate independent movement  
this.position.x += velocity * deltaTime
```

## ResizeObserver

BaseWorld tự động xử lý canvas resize — cập nhật `camera.aspect` và `renderer.setSize()`. Không cần viết thêm.

## Lưu ý

- `await demo.init()` bắt buộc — không bắt đầu loop trước khi `renderer.init()` xong
- `onDispose()` optional (default no-op) — chỉ override khi có resource cần dọn
- `protected` fields: không expose qua public API, subclass dùng trực tiếp
