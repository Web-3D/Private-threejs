# WEEKLY-CHECK — Kiểm tra định kỳ đầu tuần

> Chạy checklist này mỗi đầu tuần trước khi bắt đầu code.
> Mục tiêu: giữ toàn bộ dependencies ở version mới nhất, phát hiện API drift sớm.

---

## 1. Kiểm tra version Three.js

```bash
cd 00-Threejs
npm outdated three
```

| Kết quả                      | Hành động                                     |
| ---------------------------- | --------------------------------------------- |
| Không có bản mới             | Bỏ qua bước 3–4, sang bước 5                  |
| Có patch (0.174.x → 0.174.y) | Chạy bước 3, thường không có breaking change  |
| Có minor (0.174 → 0.175+)    | Chạy đầy đủ bước 3–4, đọc CHANGELOG trước     |

Nếu cần upgrade:
```bash
cd 00-Threejs      && npm install three@latest
cd threejs-modules && npm install three@latest
```

---

## 2. Kiểm tra npm packages còn lại

```bash
cd 00-Threejs      && npm outdated
cd threejs-modules && npm outdated
```

| Kết quả              | Hành động                                                              |
| -------------------- | ---------------------------------------------------------------------- |
| Không có gì          | Bỏ qua                                                                 |
| Có patch             | `npm update` — an toàn, không cần đọc changelog                       |
| Có minor (non-Three) | `npm install pkg@latest` → chạy `tsc --noEmit` để confirm không break |
| Có major (non-Three) | Đọc changelog trước → update → `tsc --noEmit` + chạy lại gallery      |

Sau khi update bất kỳ package nào:
```bash
cd 00-Threejs && npx tsc --noEmit
node find-unused.js
```

---

## 3. Verify các API dễ thay đổi (khi có Three.js version mới)

Grep trực tiếp trong `00-Threejs/node_modules/three/src/`:

### renderer.info — cấu trúc hay thay đổi

```bash
grep -n "drawCalls\|frameCalls\|memory" 00-Threejs/node_modules/three/src/renderers/common/Info.js
```

Verify:
- [ ] `render.drawCalls` vẫn tồn tại
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

## 4. Nếu phát hiện API thay đổi

1. Tìm file bị ảnh hưởng:
   ```bash
   grep -r "tên_API_cũ" .claude/skills/ threejs-modules/ 00-Threejs/CLAUDE.md
   ```
2. Fix theo thứ tự: module source → skill doc → CLAUDE.md
3. Ghi vào `SYNC.md` — section "API Changes"
4. Cập nhật `three-version-verified` trong meta.json của module đã fix
5. Chạy `node validate.js` để confirm PASS

---

## 5. Kiểm tra deferred/ — có item nào đủ điều kiện implement chưa

| File                               | Revisit khi                           | Hiện tại                |
| ---------------------------------- | ------------------------------------- | ----------------------- |
| `deferred/turborepo-nx.md`         | 5+ projects, build > 5 phút           | Kiểm tra số project     |
| `deferred/release-workflow.md`     | Có collaborator hoặc muốn publish npm | —                       |
| `deferred/rag-knowledge.md`        | 15+ modules hoặc 3+ projects          | Đếm modules             |
| `deferred/asset-tag-search.md`     | 30+ assets trong REGISTRY.json        | Xem REGISTRY.json       |
| `deferred/memory-vector-search.md` | 50+ memory files                      | Đếm files trong memory/ |

---

## 6. Spot-check 1 skill ngẫu nhiên

Chọn 1 skill trong `.claude/skills/`, đọc, verify ít nhất 3 API bất kỳ trong source.
Mục tiêu: duy trì thói quen, không để drift tích lũy.

---

## Log

| Tuần       | Three.js | npm packages               | API thay đổi                                                 | Ghi chú            |
| ---------- | -------- | -------------------------- | ------------------------------------------------------------ | ------------------ |
| 2026-05-11 | 0.174.0  | —                          | `render.calls` → `render.drawCalls`, bỏ `WebGPURenderTarget` | Full audit lần đầu |
