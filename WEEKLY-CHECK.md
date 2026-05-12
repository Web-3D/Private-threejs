# WEEKLY-CHECK — Kiểm tra định kỳ đầu tuần

> Chạy checklist này mỗi đầu tuần trước khi bắt đầu code.
> Mục tiêu: phát hiện API drift sớm khi Three.js release version mới.

---

## 1. Kiểm tra version Three.js

```bash
# Xem version hiện tại và có bản mới không
cd 00-Threejs
npm outdated three
```

| Kết quả                      | Hành động                                    |
| ---------------------------- | -------------------------------------------- |
| Không có bản mới             | Bỏ qua bước 2–3, sang bước 4                 |
| Có patch (0.174.x → 0.174.y) | Chạy bước 2, thường không có breaking change |
| Có minor (0.174 → 0.175+)    | Chạy đầy đủ bước 2–3, đọc CHANGELOG trước    |

---

## 2. Verify các API dễ thay đổi (khi có version mới)

Grep trực tiếp trong `00-Threejs/node_modules/three/src/`:

### renderer.info — cấu trúc hay thay đổi

```bash
grep -n "drawCalls\|frameCalls\|memory" 00-Threejs/node_modules/three/src/renderers/common/Info.js
```

Verify:
- [ ] `render.drawCalls` vẫn tồn tại (per-frame draw calls)
- [ ] `render.triangles` vẫn tồn tại
- [ ] `memory.geometries` vẫn tồn tại
- [ ] `memory.textures` vẫn tồn tại

### TSL node names — hay được rename

```bash
grep -n "export.*positionWorld\|export.*normalWorld\|export.*uv\b" 00-Threejs/node_modules/three/src/nodes/Three.TSL.js
```

Verify:
- [ ] `positionWorld` vẫn export
- [ ] `normalWorld` vẫn export
- [ ] `uv()` vẫn export
- [ ] `uniform()`, `vec3()`, `float()` vẫn export

### RenderTarget — class name hay đổi

```bash
ls 00-Threejs/node_modules/three/src/renderers/ | grep -i render
ls 00-Threejs/node_modules/three/src/core/ | grep -i render
```

Verify:
- [ ] `WebGLRenderTarget` vẫn tồn tại
- [ ] `RenderTarget` base class vẫn tồn tại
- [ ] Không có `WebGPURenderTarget` mới xuất hiện

### Node materials

```bash
ls 00-Threejs/node_modules/three/src/materials/nodes/
```

Verify:
- [ ] `NodeMaterial` vẫn tồn tại
- [ ] `MeshStandardNodeMaterial` vẫn tồn tại

---

## 3. Nếu phát hiện API thay đổi

1. Tìm file bị ảnh hưởng:
   ```bash
   grep -r "tên_API_cũ" .claude/skills/ threejs-modules/ 00-Threejs/CLAUDE.md
   ```
2. Fix từng file theo thứ tự: module source → skill doc → CLAUDE.md
3. Ghi vào `SYNC.md` — section "API Changes"
4. Chạy `node validate.js` để confirm module vẫn pass

---

## 4. Kiểm tra deferred/ — có item nào đủ điều kiện implement chưa

| File                               | Revisit khi                           | Hiện tại                |
| ---------------------------------- | ------------------------------------- | ----------------------- |
| `deferred/turborepo-nx.md`         | 5+ projects, build > 5 phút           | Kiểm tra số project     |
| `deferred/release-workflow.md`     | Có collaborator hoặc muốn publish npm | —                       |
| `deferred/rag-knowledge.md`        | 15+ modules hoặc 3+ projects          | Đếm modules             |
| `deferred/asset-tag-search.md`     | 30+ assets trong REGISTRY.json        | Xem REGISTRY.json       |
| `deferred/memory-vector-search.md` | 50+ memory files                      | Đếm files trong memory/ |

---

## 5. Spot-check 1 skill ngẫu nhiên

Chọn 1 skill trong `.claude/skills/`, đọc, verify ít nhất 3 API bất kỳ trong source.
Mục tiêu: duy trì thói quen, không để drift tích lũy.

---

## Log

| Tuần       | Three.js version | API thay đổi                                                 | Ghi chú            |
| ---------- | ---------------- | ------------------------------------------------------------ | ------------------ |
| 2026-05-11 | 0.174.0          | `render.calls` → `render.drawCalls`, bỏ `WebGPURenderTarget` | Full audit lần đầu |
