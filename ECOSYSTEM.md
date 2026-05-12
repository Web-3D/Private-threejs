# ECOSYSTEM.md — Bức tranh 3D Web 2025

> Tài liệu tham khảo dài hạn. Cập nhật khi có thay đổi lớn trong ngành.
> Last updated: 2026-05-12

---

## Bản đồ hệ sinh thái

```
3D Web Ecosystem
│
├── A. Framework Wrappers (Three.js làm core)
│   ├── R3F + Drei      — React
│   ├── TresJS          — Vue
│   ├── Threlte         — Svelte
│   └── A-Frame         — Vanilla HTML (ECS)
│
├── B. Game Engines thay thế hoàn toàn
│   ├── Babylon.js      — Microsoft-backed, WebGPU native
│   ├── PlayCanvas      — Editor online, game mobile
│   └── Wonderland      — C++/WASM, chuyên WebXR
│
├── C. Rendering Layer (cấp thấp nhất)
│   ├── Three.js        — JS, đang adopt WebGPU + TSL
│   ├── Babylon.js      — JS, WebGPU native từ đầu
│   └── wgpu (Rust)     — WASM, rời khỏi JS hoàn toàn
│
├── D. AI 3D Generation (pipeline thay đổi)
│   ├── Tripo AI        — text/image → 3D, auto-rigging
│   ├── Meshy.ai        — text/image → 3D, geometry focus
│   └── Luma AI Genie   — NeRF / Gaussian Splatting
│
├── E. Physics / Simulation
│   ├── Rapier          — Rust/WASM, nhanh nhất hiện tại
│   └── Cannon.js       — Pure JS, legacy nhưng vẫn dùng
│
├── F. No-Code / Low-Code
│   └── Spline          — browser-based, scroll animation, Webflow
│
└── G. XR / Spatial Computing
    ├── WebXR API       — W3C standard, browser native
    ├── A-Frame         — ECS layer trên WebXR
    └── Wonderland      — WebXR-first engine
```

---

## So sánh theo chiều dọc

| Hướng              | Độ phổ biến | Tốc độ thay đổi | Liên quan stack hiện tại |
| ------------------ | ----------- | --------------- | ------------------------ |
| R3F / Drei         | ⭐⭐⭐⭐⭐      | Trung bình      | Thấp — React dependency  |
| Babylon.js         | ⭐⭐⭐⭐        | Cao             | Trung bình — có thể học  |
| Three.js + TSL     | ⭐⭐⭐⭐        | Cao nhất        | ✅ Đang dùng             |
| AI 3D Generation   | ⭐⭐⭐⭐        | Rất cao         | ✅ Đang dùng (Tripo)     |
| Spline             | ⭐⭐⭐          | Trung bình      | Thấp — no-code           |
| WebXR / Spatial    | ⭐⭐⭐          | Cao             | Thấp — tương lai         |
| wgpu / Rust        | ⭐⭐           | Cao             | Rất thấp — niche         |
| PlayCanvas         | ⭐⭐⭐          | Thấp            | Thấp                     |

---

## Phân tích từng hướng

### A. Framework Wrappers — R3F và các anh em

**React Three Fiber (R3F)**
- Lớp React trên Three.js — declarative scene graph
- Ecosystem: **Drei** (helpers), **Leva** (debug UI), **React Spring** (animation)
- Dùng khi: app có nhiều UI React tích hợp với 3D
- Không dùng khi: project không dùng React, cần hiểu Three.js sâu

**TresJS (Vue)**
- Clone R3F cho Vue 3, đang phát triển nhanh
- Nhỏ hơn R3F nhưng API tương tự

**Threlte (Svelte)**
- Clean nhất về cú pháp, nhỏ nhất về bundle
- Svelte's reactive system phù hợp với animation

**A-Frame**
- HTML-based: `<a-box>`, `<a-sphere>` — không cần viết JS
- ECS (Entity Component System) — component-based như Unity
- Phù hợp: WebXR prototyping, education

---

### B. Game Engines — Khi cần nhiều hơn Three.js

**Babylon.js**
- Microsoft-backed → ổn định lâu dài
- WebGPU native từ đầu (không retrofit như Three.js)
- Có visual editor, PBR mạnh, physics tích hợp
- Học khi: muốn chuyển khỏi Three.js hoặc cần editor workflow

**PlayCanvas**
- Editor online, collaborative (như Figma cho 3D)
- Phổ biến trong game mobile HTML5
- Dùng nhiều ở game ads, casual games

**Wonderland Engine**
- C++/WASM — nhanh nhất cho WebXR
- Target: VR/AR web experiences

---

### C. Rendering Layer — Tương lai WebGPU

**Three.js + TSL** (stack hiện tại)
- TSL = shader portable sang WebGL2 và WebGPU
- 0.174 đã có WebGPU renderer — đang dẫn đầu adopt

**Babylon.js WebGPU**
- Đã stable từ lâu hơn Three.js
- Nếu Three.js TSL gặp vấn đề → Babylon là plan B

**wgpu (Rust → WASM)**
- Bỏ qua JS hoàn toàn — dùng cho performance-critical
- Vulkan/Metal/DX12/OpenGL ES backend
- Niche: game engine level, không phổ biến trong web dev

---

### D. AI 3D Generation — Đang thay đổi pipeline

**Market:** 23.5% CAGR 2024–2030 → đây là hướng lớn nhất thay đổi workflow

| Tool          | Strength                  | Weak point                    |
| ------------- | ------------------------- | ----------------------------- |
| **Tripo AI**  | Auto-rigging, 3M+ devs    | Texture đôi khi không đồng đều |
| **Meshy.ai**  | Geometry detail tốt       | Rigging kém hơn Tripo         |
| **Luma Genie**| Realism cao (NeRF/Splat)  | Không có mesh rõ ràng để edit |

**Pipeline hiện tại** (đang dùng):
```
Tripo/Meshy → raw/ → Blender MCP (optimize) → optimized/ → gltf-transform → production/
```

---

### E. Physics — Thêm khi cần

**Rapier** (khuyên dùng)
- Rust/WASM — fastest web physics
- API: `@dimforge/rapier3d-compat`
- Tích hợp tốt với R3F (qua `@react-three/rapier`) và vanilla

**Cannon.js / Cannon-es**
- Pure JS — dễ setup hơn, chậm hơn
- Legacy nhưng vẫn đủ cho simple physics

---

### F. No-Code — Spline và vai trò của nó

**Spline**
- Browser-based editor, export embed code
- State-based animation (không timeline-based)
- Webflow integration — popular với marketing/landing page

**Dùng khi:** client muốn 3D trên website mà không cần dev nhiều  
**Không dùng khi:** cần full control, custom shader, dynamic content

---

### G. WebXR / Spatial Computing — Dài hạn

- **5.35B người** có thể dùng WebXR device (2024)
- **Metaverse market:** $153.4B (2025) → $3.37T (2034) — số lớn nhưng timeline không chắc
- Apple Vision Pro đẩy spatial computing mainstream
- Wolvic browser: Eye/Hand Tracking support (2025)

**Cần theo dõi:** khi headset rẻ hơn → WebXR sẽ thực sự bùng nổ

---

## Vị trí của stack hiện tại

```
[Stack hiện tại]
Vite + TypeScript + Three.js 0.174 + TSL + WebGPU renderer
         ↓
[Nằm ở đây trong ecosystem]
Rendering Layer C → đang dẫn đầu về WebGPU adoption
AI Pipeline D     → đang dùng Tripo + Meshy
         ↓
[Có thể mở rộng sang]
Physics E         → thêm Rapier khi cần simulation
WebXR G           → Three.js renderer.xr khi project cần VR
```

---

## Tích hợp vào dự án — Roadmap

### Tích hợp được ngay (khi cần)

| Tool | Package | Tích hợp vào đâu | Điều kiện |
| ---- | ------- | ---------------- | --------- |
| **Leva** | `leva` | Dev workflow — tweak shader uniforms real-time | Ngay Phase A khi build TriplanarMapping |
| **Rapier** | `@dimforge/rapier3d-compat` | `threejs-modules/physics/PhysicsWorld/` | Khi scene cần rigid body / va chạm |
| **WebXR** | built-in Three.js | `renderer.xr.enabled = true` | Khi muốn thử VR — gần như zero cost |

### Cần setup thêm (medium effort)

| Tool | Effort | Giá trị | Ghi chú |
| ---- | ------ | ------- | ------- |
| **Gaussian Splatting viewer** | 2–4h | Cao nếu Luma mesh export mature | Xem watchlist |
| **Babylon.js (song song)** | Dự án riêng | Cao — so sánh trực tiếp | Xem phân tích bên dưới |

---

## Watchlist — Theo dõi định kỳ

| Tool / Trend | Theo dõi gì | Check mỗi |
| --- | --- | --- |
| **Gaussian Splatting → mesh** | Có tool convert splat → clean mesh chưa? | 3 tháng |
| **Tripo / Meshy UV quality** | UV đủ tốt để bypass tri-planar không? | 2 tháng |
| **Three.js TSL stability** | WebGPU renderer production-ready chưa? | 1 tháng |
| **Babylon.js WebGPU benchmark** | Performance so Three.js real-world? | 6 tháng |
| **WebXR headset pricing** | Khi < $300 → spatial computing mainstream | 6 tháng |
| **R3F independence** | Có tách khỏi React dependency không? | 6 tháng |

---

## Babylon.js — Dự án song song?

**Đánh giá:** Có tiềm năng — nhưng đúng thời điểm mới có giá trị.

### Điểm mạnh của Babylon.js cho dự án song song

| Yếu tố | Chi tiết |
| --- | --- |
| **Microsoft-backed** | Không bị abandon như nhiều OSS khác — ổn định lâu dài |
| **WebGPU native từ đầu** | Không retrofit như Three.js — architecture sạch hơn |
| **Visual Node Material Editor** | Drag-drop shader graph — nhanh prototype hơn code TSL thuần |
| **Inspector built-in** | Debug scene ngay trong browser, không cần viết RuntimeGuard |
| **Physics tích hợp sẵn** | Havok physics (Microsoft) — không cần setup Rapier riêng |
| **Job market** | Nhiều enterprise dùng Babylon.js cho product visualization, industrial |

### Khi nào nên bắt đầu

```
Không nên ngay bây giờ — lý do:
  Phase A chưa xong → threejs-modules chưa có foundation
  Học song song 2 engine → diluted focus, không sâu cái nào

Nên bắt đầu sau khi:
  ✅ Phase A hoàn thành (4 module: GlobalUniforms, TriplanarMapping, WorldNoise, RoundedCorners)
  ✅ Có ít nhất 1 scene chạy ổn với Three.js
  → Lúc đó hiểu đủ sâu để so sánh meaningful
```

### Format dự án song song đề xuất

Không clone toàn bộ — build lại 1 module Phase A bằng Babylon.js để so sánh trực tiếp:

```
01-Babylon/
├── src/
│   └── TriplanarMapping/   ← rebuild module này bằng Babylon Node Material
└── package.json
```

So sánh: API khác nhau thế nào, performance ra sao, shader workflow dễ hay khó hơn → quyết định có đầu tư thêm không.

---

## Không cần theo dõi (với stack hiện tại)

- **wgpu/Rust** — quá low-level, chỉ relevant khi build game engine từ đầu
- **Godot web export** — game engine workflow, không phải web-first
- **A-Frame** — HTML-based, conflict với TypeScript module system
- **Spline** — no-code, conflict với custom shader workflow
- **PlayCanvas** — editor-first, không phù hợp code-first architecture
- **Cannon.js** — deprecated, dùng Rapier thay thế
