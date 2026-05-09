---
name: asset-pipeline
description: Quản lý vòng đời 3D asset — thêm asset mới, track trạng thái raw/optimized/production, update catalog. Triggers khi nhận GLB từ AI tool hoặc khi asset chuyển stage.
triggers: "thêm asset", "asset mới", "nhận GLB", "nhận model", "update asset", "asset xong", "production ready", "quản lý asset", "track asset"
---

## 3 Trạng thái pipeline — không bỏ qua bước nào

```
raw/          →      optimized/      →      production/
AI tool output       Blender MCP             gltf-transform
(giữ nguyên)         (cleanup)               (Draco+KTX2)
```

---

## Workflow A: Thêm asset MỚI từ AI tool

### Bước 1: Tạo folder

```
assets/[category]/[asset-name-kebab-case]/
├── raw/
├── optimized/
└── production/
```

Category:
- `buildings` — công trình (nhà, quán, tòa nhà, cổng...)
- `characters` — nhân vật
- `environments` — background splat (.spz)
- `props` — đồ vật nhỏ (ghế, bảng, xe, đèn...)
- `textures` — PBR texture library

### Bước 2: Tạo `meta.json`

```json
{
  "name": "ten-asset-kebab-case",
  "category": "buildings",
  "source-tool": "tripo",
  "status": "raw",
  "description": "Mô tả 1 câu",
  "tags": ["vietnamese", "cafe"],
  "polycount": {
    "raw": null,
    "optimized": null,
    "production": null
  },
  "texture-size": null,
  "file-size": {
    "raw": null,
    "optimized": null,
    "production": null
  },
  "used-in": [],
  "created": "YYYY-MM-DD",
  "notes": ""
}
```

### Bước 3: Đặt file vào `raw/`

- Copy file từ AI tool vào `assets/[category]/[name]/raw/`
- Đo polycount + file size → điền vào `meta.json`
- **Không sửa file raw** — giữ nguyên để có thể diff sau

### Bước 4: Update `meta.json` với số liệu raw

```json
"polycount": { "raw": 45000 },
"file-size": { "raw": "12.4MB" },
"status": "raw"
```

### Bước 5: Update catalog trong `assets/README.md`

Thêm vào bảng của category tương ứng:

```markdown
| ten-asset | tripo | raw | 45k tris | — |
```

---

## Workflow B: Asset vừa qua Blender MCP (raw → optimized)

Khi Blender MCP xử lý xong:

### 1. Copy output vào `optimized/`

### 2. Update `meta.json`

```json
"polycount": { "raw": 45000, "optimized": 8200 },
"file-size": { "raw": "12.4MB", "optimized": "3.1MB" },
"status": "optimized"
```

### 3. Verify trước khi mark optimized

- [ ] Polycount giảm đáng kể so với raw
- [ ] Origin point đúng (bottom-center cho building, center cho prop)
- [ ] Không có mesh floating hoặc inverted normals
- [ ] UV unwrap hợp lý (nếu dùng UV-based texture)

### 4. Update catalog

```markdown
| ten-asset | tripo | optimized | 8.2k tris | — |
```

---

## Workflow C: Asset ready cho browser (optimized → production)

Sau khi chạy gltf-transform pipeline (`gltf-pipeline` skill):

### 1. Copy output vào `production/`

### 2. Verify budget TRƯỚC khi mark production

| Category | Polycount max | Texture max |
|----------|--------------|-------------|
| Prop nhỏ | 500 tris | 512×512 |
| Building | 5,000 tris | 2048×2048 |
| Hero object | 20,000 tris | 2048×2048 |
| Character NPC | 10,000 tris | 1024×1024 |
| Character hero | 30,000 tris | 2048×2048 |

**Nếu không đạt budget → KHÔNG mark production → báo cần optimize thêm.**

### 3. Update `meta.json`

```json
"polycount": { "raw": 45000, "optimized": 8200, "production": 8200 },
"texture-size": "2048x2048",
"file-size": { "raw": "12.4MB", "optimized": "3.1MB", "production": "0.8MB" },
"status": "production"
```

### 4. Update catalog — thêm polycount production

```markdown
| ten-asset | tripo | production | 8.2k tris | — |
```

---

## Workflow D: Asset được dùng trong project

Khi Claude Code import asset vào project:

Update `meta.json` field `used-in`:

```json
"used-in": ["01-khu-pho-3d"]
```

Update catalog:

```markdown
| ten-asset | tripo | production | 8.2k tris | 01-khu-pho-3d |
```

---

## Workflow E: Textures (khác với geometry)

Textures không có raw/optimized — chỉ 1 level:

```
assets/textures/[texture-name]/
├── meta.json
├── diffuse_2k.ktx2
├── normal_2k.ktx2
└── roughness_2k.ktx2
```

`meta.json` cho texture:

```json
{
  "name": "stone-cobble-01",
  "category": "textures",
  "source": "poly-haven",
  "resolution": "2048x2048",
  "maps": ["diffuse", "normal", "roughness"],
  "format": "ktx2",
  "used-in": [],
  "license": "CC0",
  "created": "YYYY-MM-DD"
}
```

---

## Bộ luật không ngoại lệ

1. **Không sửa `raw/`** — output AI tool giữ nguyên 100%
2. **Project chỉ dùng `production/`** — không shortcut sang raw/optimized
3. **Budget phải đạt** trước khi mark `production` — không exception
4. **`meta.json` luôn sync** với trạng thái thực — không để stale
5. **Catalog `assets/README.md` luôn update** sau mỗi stage change

---

## Lỗi thường gặp

- ❌ **Đặt file vào sai folder** → production file trong raw/
- ❌ **`meta.json` status không match** với file thực tế có → confuse Claude
- ❌ **Không check budget** trước khi mark production → scene bị lag
- ❌ **Không update `used-in`** → không biết asset nào đang được dùng ở đâu
- ❌ **Tên folder có space hoặc CamelCase** → dùng kebab-case: `quan-ca-phe`
