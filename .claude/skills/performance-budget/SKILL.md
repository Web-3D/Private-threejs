---
name: performance-budget
description: Use when adding new objects to a scene, creating animation loops, designing World classes, or when user asks about FPS, draw calls, triangles, or performance. Triggers when files in src/world/ are created/modified. Also triggers on Vietnamese phrases: "thêm object", "thêm nhiều", "tạo World", "animation loop", "FPS", "draw call", "nặng", "lag", "hiệu năng". Do NOT use for build-time optimization (bundle size, code splitting) — that's build tooling, not runtime budget.
---

## Tại sao cần budget cứng

Three.js không tự giới hạn draw calls hay triangle count. Không có cơ chế tự động cảnh báo khi scene quá nặng — perf drop xảy ra im lặng. Budget này là con số tối thiểu để đảm bảo 60fps trên mid-range hardware.

---

## Giới hạn bắt buộc

| Chỉ số | Giới hạn | Đo bằng |
|--------|----------|---------|
| Draw calls / frame | < 100 | `renderer.info.render.calls` |
| Triangle count | < 500,000 | `renderer.info.render.triangles` |
| Kích thước texture tối đa | 2048 × 2048 | `texture.image.width` |
| Bundle size (gzipped) | < 500 KB | `npm run build` |
| Frame time | < 16.67ms | DevTools Performance tab |

---

## RuntimeGuard — bắt buộc trong mọi World class

`RuntimeGuard` là cơ chế cảnh báo runtime duy nhất — bảng số tĩnh ở trên không tự enforce được. Phải thêm vào mọi class có animation loop.

```typescript
class RuntimeGuard {
  constructor(private renderer: THREE.WebGPURenderer | THREE.WebGLRenderer) {}

  check(): void {
    const { calls, triangles } = this.renderer.info.render
    if (calls > 100) console.warn(`[Budget] Draw calls: ${calls}/100`)
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
- ❌ **Tạo geometry/texture trong animation loop** → leak 60 lần/giây — xem `dispose-pattern` skill
- ❌ **Dùng riêng `Mesh` cho > 100 object giống nhau** → dùng `InstancedMesh` thay thế
- ❌ **Texture 4K cho object xa camera** → lãng phí GPU bandwidth, không có visual benefit

---

## Cây quyết định khi vượt budget

```
Vượt limit?
├── Draw calls > 100  → InstancedMesh hoặc BatchedMesh
├── Triangles > 500k  → LOD hoặc gltf-transform simplify
├── Texture > 2048    → Resize hoặc KTX2 compress
├── Frame > 16ms      → Profile DevTools, tìm hot path
└── Bundle > 500KB    → Code split, lazy import
```
