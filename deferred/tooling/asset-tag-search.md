# asset-tag-search — Tag Index & Search cho Asset Library

**Revisit khi:** 30+ asset trong REGISTRY.json, hoặc mất > 1 phút tìm asset theo đặc điểm.

---

## Vấn đề giải quyết

Khi library lớn, tìm "tất cả buildings có tag vietnamese + status production" cần đọc
từng `meta.json`. Tag index ngược giải quyết bằng 1 lookup.

---

## Thiết kế đề xuất

### 1. Tag index trong REGISTRY.json

`validate.js` — sau mỗi asset PASS, rebuild `_tagIndex`:

```json
{
  "_tagIndex": {
    "vietnamese": ["quan-ca-phe", "nha-pho-tuong-co"],
    "splat":      ["pho-co-hanoi-01"],
    "npc":        ["npc-vendor-female-01"],
    "cafe":       ["quan-ca-phe"]
  }
}
```

### 2. Script search-assets.js

```
node search-assets.js --tag vietnamese --status production
node search-assets.js --tag splat --category environments
node search-assets.js --shader vietnamese-street
```

Output: bảng markdown để Claude/Gemini paste vào context.

### 3. CLAUDE.md Living Index — thêm section tags

`update-index.js` thêm `scanTopTags()` — liệt kê 10 tag phổ biến nhất.

---

## Không làm bây giờ vì

- Phase A chỉ có ~8 asset — REGISTRY.json đọc thẳng là đủ
- Tags đã lưu trong `meta.json`, sẵn sàng khi cần index
- Tránh over-engineer trước khi có data thật
