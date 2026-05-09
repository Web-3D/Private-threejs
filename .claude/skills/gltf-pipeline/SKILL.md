---
name: gltf-pipeline
description: Use when optimizing, cleaning, or compressing .glb/.gltf files for Three.js. Triggers on gltf-transform commands, model import prep, or geometry optimization. Also triggers on Vietnamese phrases: "làm sạch model", "tối ưu model", "nén model", "weld", "draco", "simplify mesh", "import geometry", "chuẩn bị model". Do NOT use for runtime LOD switching — that's the lod-system skill.
---

## Thứ tự bắt buộc — không đổi được

```
weld → simplify → normals → draco
```

**Tại sao thứ tự này là cứng:**

| Bước | Lý do phải đứng đây |
|------|---------------------|
| `weld` trước `simplify` | Simplify tạo vertex mới — weld sau sẽ merge sai |
| `simplify` trước `normals` | Simplify phá normal cũ — phải tính lại sau |
| `normals` trước `draco` | Draco compress data — không sửa được sau khi compress |
| `draco` luôn cuối | Delivery compression — apply sau mọi geometry processing |

---

## CLI Commands

```bash
# Từng bước riêng (để kiểm tra kết quả mỗi bước)
npx gltf-transform weld input.glb step1.glb
npx gltf-transform simplify --ratio 0.5 --error 0.001 step1.glb step2.glb
npx gltf-transform normals step2.glb step3.glb
npx gltf-transform draco step3.glb output.glb

# Chained một lệnh (dùng khi đã quen pipeline)
npx gltf-transform weld input.glb - | \
npx gltf-transform simplify --ratio 0.5 - - | \
npx gltf-transform normals - - | \
npx gltf-transform draco - output.glb
```

---

## Flags quan trọng

### `weld`
```bash
npx gltf-transform weld --tolerance 0.0001 input.glb output.glb
```
- `--tolerance` — khoảng cách tối đa để merge 2 vertex (default: 0.0001). Tăng nếu model có seam không mong muốn.

### `simplify`
```bash
npx gltf-transform simplify --ratio 0.5 --error 0.001 input.glb output.glb
```
- `--ratio` — tỷ lệ giữ lại (0.5 = giữ 50% triangle). Start với 0.5, giảm dần nếu muốn nhẹ hơn.
- `--error` — sai số cho phép (0.001 = 0.1% kích thước bounding box). Tăng nếu simplify bị reject.

### `normals`
```bash
# Smooth normals (mặc định — cho organic shape)
npx gltf-transform normals input.glb output.glb

# Hard normals (cho architecture, sharp edges)
npx gltf-transform normals --overwrite input.glb output.glb
```

### `draco`
```bash
npx gltf-transform draco input.glb output.glb

# Tùy chỉnh compression level (default: 7, max: 10)
npx gltf-transform draco --compression-level 10 input.glb output.glb
```

---

## Khi nào BỎ QUA từng bước

| Bước | Bỏ khi | Lý do |
|------|--------|-------|
| `weld` | Model có hard edge/seam cố ý | Weld sẽ phá seam đó |
| `simplify` | Polycount đã thấp (prop < 5k, hero < 20k) | Không cần — tốn thời gian, rủi ro mất detail |
| `normals` | Model có custom normal (hand-painted, stylized) | Tính lại sẽ mất normal cẩn thận đã bake |
| `draco` | KHÔNG bao giờ bỏ | Luôn nén trước khi deliver |

---

## Target polycount theo asset type

| Loại asset | Target | Ghi chú |
|-----------|--------|---------|
| Prop nhỏ (ghế, hộp) | < 500 tris | Xa camera, LOD billboard sau |
| Building | < 5k tris | Per building, không tính interior |
| Hero object (gần camera) | < 20k tris | Có thể giữ detail cao hơn |
| Character NPC | < 10k tris | Có VAT animation sau |
| Character hero | < 30k tris | Skinned, cần topology đẹp |

---

## Verify sau khi xử lý

```bash
# Xem thông tin model
npx gltf-transform inspect output.glb

# Output mẫu cần kiểm tra:
# Meshes: triangle count, vertex count
# Textures: width × height, format
# Size: KB before/after
```

Checklist:
- [ ] Polycount trong budget (xem bảng trên)
- [ ] Texture ≤ 2048×2048
- [ ] File size giảm so với input (Draco thường giảm 60-80%)
- [ ] Mở trong Three.js — không có seam vỡ, normal đúng hướng

---

## Lỗi thường gặp

- ❌ **Simplify trước weld** → vertex seam bị vỡ sau simplify
- ❌ **Draco trước normals** → normal bị mất sau decompress ở runtime  
- ❌ **`--ratio 0.1` ngay từ đầu** → mất quá nhiều detail — start 0.5, giảm dần
- ❌ **Bỏ qua `inspect` sau khi xong** → không biết kết quả có đạt budget không
