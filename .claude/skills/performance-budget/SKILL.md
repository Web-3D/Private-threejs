---
name: performance-budget
description: Use when adding new objects to a scene, creating animation loops, designing World classes, or when user asks about FPS, draw calls, triangles, or performance. Triggers when files in src/world/ are created/modified. Also triggers on Vietnamese phrases: "thêm object", "thêm nhiều", "tạo World", "animation loop", "FPS", "draw call", "nặng", "lag", "hiệu năng". Do NOT use for build-time optimization (bundle size, code splitting) — that's build tooling, not runtime budget.
---

## Tại sao cần budget cứng

Three.js không tự giới hạn draw calls hay triangle count. Không có cơ chế tự động cảnh báo khi scene quá nặng — perf drop xảy ra im lặng. Budget này là con số tối thiểu để đảm bảo 60fps trên mid-range hardware.

---

## Giới hạn bắt buộc

| Chỉ số                    | Giới hạn    | Đo bằng                          |
| ------------------------- | ----------- | -------------------------------- |
| Draw calls / frame        | < 100       | `renderer.info.render.drawCalls` |
| Triangle count            | < 500,000   | `renderer.info.render.triangles` |
| Kích thước texture tối đa | 2048 × 2048 | `texture.image.width`            |
| Bundle size (gzipped)     | < 500 KB    | `npm run build`                  |
| Frame time                | < 16.67ms   | DevTools Performance tab         |

---

## RuntimeGuard — bắt buộc trong mọi World class

`RuntimeGuard` là cơ chế cảnh báo runtime duy nhất — bảng số tĩnh ở trên không tự enforce được. Phải thêm vào mọi class có animation loop.

```typescript
class RuntimeGuard {
  constructor(private renderer: THREE.WebGPURenderer | THREE.WebGLRenderer) {}

  check(): void {
    const { drawCalls, triangles } = this.renderer.info.render  // drawCalls = per-frame
    if (drawCalls > 100) console.warn(`[Budget] Draw calls: ${drawCalls}/100`)
    if (triangles > 500_000) console.warn(`[Budget] Triangles: ${triangles}/500k`)
  }
}
```

**Cách tích hợp vào animation loop:**

```typescript
class MyWorld {
  private guard: RuntimeGuard

  constructor(renderer: THREE.WebGPURenderer) {
    this.guard = new RuntimeGuard(renderer)
  }

  private animate(): void {
    requestAnimationFrame(() => this.animate())
    // ... render logic ...
    this.renderer.render(this.scene, this.camera)
    this.guard.check() // Luôn là dòng cuối cùng trong frame
  }
}
```

---

## Khi nào bắt buộc dùng RuntimeGuard

- Mọi `World` class có `requestAnimationFrame` loop
- Sau khi thêm object mới vào scene trong quá trình phát triển
- Sau khi load GLTF model
- Sau khi bật thêm post-processing pass

---

## Implementation checklist

- [ ] Thêm `RuntimeGuard` vào constructor của mọi `World` class
- [ ] Gọi `guard.check()` là **dòng cuối cùng** trong frame — sau `renderer.render()`
- [ ] Đọc `renderer.info.render` bằng tay ít nhất 1 lần trước khi merge feature mới
- [ ] Mọi GLTF load xong → log `renderer.info.render.triangles` ngay sau `scene.add()`
- [ ] Object > 100 instance cùng geometry+material → đổi sang `InstancedMesh` trước khi commit
- [ ] Post-processing pass mới → verify frame time còn < 16ms sau khi bật

---

## Performance budget của chính các giải pháp

| Kỹ thuật                       | Overhead                              | Ghi chú                                 |
| ------------------------------ | ------------------------------------- | --------------------------------------- |
| `RuntimeGuard.check()`         | ~0.01ms/frame                         | Chỉ đọc CPU counter, không query GPU    |
| `InstancedMesh` vs 100× `Mesh` | Draw calls –99%, GPU time –60–80%     | One-time setup cost khi init            |
| `mergeGeometries()`            | CPU cost 1 lần lúc setup, runtime = 0 | Chỉ dùng cho static geometry            |
| LOD                            | +1 distance check/frame               | Negligible — thường tiết kiệm hơn nhiều |
| KTX2 texture                   | Load time +5–10%, VRAM –75%           | Cần `KTX2Loader` setup                  |

---

## Chiến lược tối ưu theo từng chỉ số

**Draw calls vượt 100:**
- Dùng `InstancedMesh` cho các object giống hệt nhau (cùng geometry + material)
- Dùng `BatchedMesh` cho các object khác geometry nhưng cùng material
- Merge static geometry bằng `BufferGeometryUtils.mergeGeometries()`

**Triangle count vượt 500k:**
- Implement LOD — giảm detail theo khoảng cách camera
- Decimate model bằng `gltf-transform simplify` trước khi import
- Cull object ngoài frustum — Three.js tự làm nhưng verify với `renderer.info`

**Texture vượt 2048:**
- Resize về 2048 hoặc nhỏ hơn
- Compress sang KTX2 format (Basis Universal)
- Object xa camera không cần texture full-res — dùng mipmap

**Frame time vượt 16ms:**
- Profile bằng DevTools Performance tab (F12 → Performance → Record)
- Tìm hot path: thường là draw calls nhiều hoặc shader phức tạp
- Tách heavy computation sang Web Worker nếu là CPU-bound

---

## Lỗi thường gặp

- ❌ **Không có `RuntimeGuard`** → perf degradation im lặng, chỉ phát hiện khi user phàn nàn lag
- ❌ **Dùng `render.calls` thay vì `render.drawCalls`** → `render.calls` là cumulative (tăng mãi từ khi app khởi động, không bao giờ reset) → warn vĩnh viễn sau ~1.7 giây. Phải dùng `render.drawCalls` (per-frame, reset mỗi frame)
- ❌ **Tạo geometry/texture trong animation loop** → leak 60 lần/giây — xem `dispose-pattern` skill
- ❌ **Dùng riêng `Mesh` cho > 100 object giống nhau** → dùng `InstancedMesh` thay thế
- ❌ **Texture 4K cho object xa camera** → lãng phí GPU bandwidth, không có visual benefit

---

## Cây quyết định

```
Scene nặng / vượt limit?
├── Draw calls > 100   → InstancedMesh hoặc BatchedMesh
├── Triangles > 500k   → LOD hoặc gltf-transform simplify
├── Texture > 2048     → Resize hoặc KTX2 compress
├── Frame > 16ms       → Profile DevTools → tìm hot path
└── Bundle > 500KB     → Code split, lazy import

Shader tốn?
├── Nhiều texture sample   → bandwidth-bound, giảm số sample (< 4/fragment)
├── Dùng pow/exp/log       → thay bằng polynomial approximation
├── Branch if/else         → dùng mix() + step() thay thế
└── Material trong loop    → tạo 1 lần, reuse — compile 50–500ms one-time

GPU Memory tăng dần?
├── JS Heap không shrink   → dispose() đang thiếu — xem dispose-pattern
└── GPU Memory tăng liên tục → texture/geometry chưa giải phóng — 2048 texture = 16 MB × 60/giây
```
