---
name: dispose-pattern
description: Use when creating or modifying classes that own GPU resources in this Three.js project (BufferGeometry, Material, Texture, RenderTarget, EffectComposer, OrbitControls). Triggers on files in src/world/, src/shaders/, src/utils/ that allocate GPU memory. Also triggers on Vietnamese phrases: "tạo class", "tạo mesh", "tạo object", "thêm vào scene", "geometry", "material", "texture". Do NOT use for pure CPU classes (math helpers, data-only utils) — those don't need disposal.
---

## Tại sao dispose quan trọng

WebGL/WebGPU không có garbage collector cho GPU memory. Mỗi `BufferGeometry`, `Material`, `Texture` tạo ra đều chiếm VRAM cho đến khi `.dispose()` được gọi tường minh. Quên dispose → VRAM tăng dần → lag sau 10-15 phút → crash trình duyệt. Bug này im lặng, không có error message.

---

## Checklist 8 điểm — bắt buộc cho mọi class GPU

- [ ] Khai báo `private isDisposed = false` ngay đầu class
- [ ] Có method `dispose(): void`
- [ ] Dòng đầu tiên của `dispose()` phải là `if (this.isDisposed) return`
- [ ] Mọi field GPU phải nullable: `Type | null = null`
- [ ] Gọi `.dispose()` tường minh trên từng resource GPU
- [ ] Gọi `mesh?.parent?.remove(mesh)` trước khi null — tránh orphan trong scene graph
- [ ] Null toàn bộ reference sau khi dispose — giúp GC thu hồi CPU memory
- [ ] Set `this.isDisposed = true` là dòng cuối cùng

---

## Phải dispose (MUST-DISPOSE)

- `BufferGeometry` — mọi loại, kể cả custom attribute
- `Material` — mọi subtype: `MeshStandardMaterial`, `ShaderMaterial`, `MeshBasicMaterial`...
- `Texture` — kể cả `CompressedTexture`, `DataTexture`, `VideoTexture`, `CubeTexture`
- `WebGLRenderTarget` / `RenderTarget` — thường quên nhất khi dùng post-processing (`WebGPURenderTarget` không tồn tại trong Three.js 0.174 — dùng `RenderTarget` base class)
- `EffectComposer` + từng `Pass` thêm vào (mỗi Pass là 1 RenderTarget ẩn)
- `OrbitControls` và mọi controls tương tự — có event listener bên trong
- Event listener thủ công — phải `removeEventListener` với đúng reference đã bind

---

## Không dispose (NO-DISPOSE) — tránh dispose nhầm

- `Vector3`, `Matrix4`, `Quaternion`, `Euler`, `Color` — chỉ là CPU object, GC tự xử lý
- `Object3D`, `Group`, `Mesh` wrapper — dispose geometry + material của chúng, không dispose wrapper
- `Scene` object — dispose các children bên trong, không dispose bản thân Scene

---

## Template chuẩn

```typescript
class MyGPUClass {
  private geometry: THREE.BufferGeometry | null = null
  private material: THREE.Material | null = null
  private mesh: THREE.Mesh | null = null
  private isDisposed = false

  constructor() {
    this.geometry = new THREE.BufferGeometry()
    this.material = new THREE.MeshStandardMaterial()
    this.mesh = new THREE.Mesh(this.geometry, this.material)
  }

  dispose(): void {
    if (this.isDisposed) return          // Guard chống double-free
    this.geometry?.dispose()             // GPU memory giải phóng
    this.material?.dispose()             // GPU memory giải phóng
    this.mesh?.parent?.remove(this.mesh) // Xóa khỏi scene graph
    this.geometry = null                 // CPU reference về null
    this.material = null
    this.mesh = null
    this.isDisposed = true               // Đánh dấu đã dispose
  }
}
```

Tham chiếu canonical: `src/templates/BaseShader.ts`

---

## Performance budget

- **VRAM per object nếu quên dispose:** geometry thường 1–4 MB, texture 2048×2048 ≈ 16 MB, RenderTarget = texture × số buffer
- **Leak speed trong animation loop:** tạo object mỗi frame → ×60/giây → 1 GB+ trong vòng 1 phút
- **Dấu hiệu sớm:** Chrome DevTools → Memory tab → JS Heap không shrink sau khi bấm "Collect garbage"
- **Dấu hiệu muộn:** Chrome Task Manager → cột "GPU Memory" tăng dần, không giảm khi navigate giữa scene
- **Verify sau dispose():** GPU Memory trong Task Manager phải giảm rõ — nếu không giảm, còn resource đang bị giữ
- **Shared resource trap:** dispose material đang được dùng chung → toàn bộ mesh phụ thuộc render solid black, không có error

---

## Lỗi thường gặp

- ❌ **Không có `isDisposed` guard** → gọi dispose 2 lần → crash hoặc undefined behavior
- ❌ **Quên `parent?.remove()`** → mesh biến mất về mặt logic nhưng vẫn render trong scene
- ❌ **Dispose shared resource** → nhiều mesh dùng chung 1 material, dispose 1 cái là break tất cả
- ❌ **Tạo geometry/texture trong animation loop** → mỗi frame tạo mới mà không dispose → leak tăng 60 lần/giây
- ❌ **Dùng `this.geometry!.dispose()`** → ESLint block non-null assertion, và ẩn bug nếu field đã null

---

## Pattern với children array

```typescript
// Khi class chứa nhiều object con
dispose(): void {
  if (this.isDisposed) return
  this.children.forEach(child => child.dispose())
  this.children = []
  this.isDisposed = true
}

// Khi cần traverse sâu vào Group/Object3D
this.group.traverse(obj => {
  if (obj instanceof THREE.Mesh) {
    obj.geometry.dispose()
    if (Array.isArray(obj.material)) {
      obj.material.forEach(m => m.dispose())
    } else {
      obj.material.dispose()
    }
  }
})
this.scene.remove(this.group)
```

---

## Checklist tự verify trước khi commit

- Mỗi `new THREE.*` tạo GPU resource có dispose tương ứng không?
- `isDisposed` guard có ở đầu `dispose()` không?
- Mọi GPU field có kiểu `Type | null` không?
- `parent?.remove()` được gọi trước khi null không?
- Nếu class có children → dispose từng child không?
