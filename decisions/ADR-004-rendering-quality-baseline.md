# ADR-004 — Rendering Quality Baseline: pixelRatio + Shadow + Light

**Ngày:** 2026-05-24 | **Trạng thái:** Accepted  
**Revisit khi:** Chuyển sang deferred rendering hoặc dùng SSAO

## Context

Khi nhìn toàn cảnh khu phố trên màn hình 125% DPI (Windows 11 scale), thấy 2 vấn đề:
1. **Mờ (blurry)** — cạnh mesh không sắc nét, text trên building không đọc được
2. **Nhựa (plastic)** — mesh bóng đều, không có shadow, không có depth cue → trông như toy

Diagnose từng vấn đề, tìm root cause, fix tại đúng chỗ.

---

## Problem 1 — Blurry rendering

**Root cause:** `BaseWorld/index.ts` hardcode `setPixelRatio(1)`.

Trên Windows 11 với 125% DPI, `window.devicePixelRatio = 1.25`. Canvas được render ở 80% resolution rồi upscale — mọi cạnh đều bị smear.

**Fix:**
```typescript
// BaseWorld/index.ts
this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
```

**Tại sao cap ở 2?**  
- devicePixelRatio > 2 (retina 3×, 4×): không có visual gain rõ ràng nhưng GPU cost tăng theo pixel² — 3× DPI tốn 9× fill rate so với 1×.
- `min(dpr, 2)` = đủ sắc nét trên mọi màn hình, không waste GPU.

**Lưu ý:** Fix này apply global cho mọi project extend BaseWorld (00-Threejs, 01-Doraemon, etc.).

---

## Problem 2 — Plastic look

**Root causes (3 cái chồng nhau):**

### 2a. Ambient quá cao
```typescript
// Trước: AmbientLight(0xffffff, 0.7) — quá sáng, shadow không nổi
// Sau:   AmbientLight(0xffffff, 0.4) — shadow contrast rõ hơn
```
Ambient cao → shadow fill-in nhiều → depth gradient phẳng → nhựa.

### 2b. Không có shadow
WebGPURenderer không tự bật shadow. Cần enable explicit:
```typescript
this.renderer.shadowMap.enabled = true
this.renderer.shadowMap.type = THREE.PCFSoftShadowMap  // value = 2
```

**Tại sao PCFSoftShadowMap?**  
PCFSoft = 9-tap Poisson filter, rìa shadow blur mềm. Verified: `ShadowNode.js` line 514 đọc `renderer.shadowMap.type`, index 2 = `PCFSoftShadowFilter`. Works với WebGPURenderer.

**Shadow bias để tránh acne:**
```typescript
sun.shadow.bias = -0.001        // push shadow về phía caster trên flat surface
sun.shadow.normalBias = 0.05    // offset theo surface normal — tránh acne trên cylinder/column
```

### 2c. GridHelper không nhận shadow
`THREE.GridHelper` là Line object, không phải Mesh → `receiveShadow` không hoạt động. Fix: thêm separate ground `THREE.Mesh` với `receiveShadow = true`.

```typescript
// GridHelper giữ lại cho grid lines visual
this.gridHelper = new THREE.GridHelper(30, 30, 0x334466, 0x222244)
// Thêm ground plane riêng để nhận shadow
const ground = new THREE.Mesh(
  new THREE.PlaneGeometry(30, 30),
  new THREE.MeshToonMaterial({ color: 0x111827 })
)
ground.rotation.x = -Math.PI / 2
ground.receiveShadow = true
this.scene.add(ground, this.gridHelper)
```

---

## Kết quả

| Vấn đề | Trước | Sau |
|---|---|---|
| Pixel sharpness | Blurry ở 125% DPI | Sắc nét — pixelRatio = 1.25 |
| Shadow | Không có | PCFSoft, bias clean, ground nhận shadow |
| Depth cue | Flat/plastic | Shadow + ambient thấp → rõ depth |

---

## Trade-offs

- `setPixelRatio(devicePixelRatio)` không cap: render cost tỷ lệ pixel² → cap ở 2 là pragmatic.
- Shadow mapSize 1024×1024: đủ cho single building Lab. City scene cần 2048 hoặc cascaded shadow.
- `PCFSoftShadowMap` so với `BasicShadowMap`: tốn ~9× sample/fragment nhưng visual gain đáng kể. Chấp nhận được cho Lab.
