# Character Base + Variant Config

**Phase dự kiến:** Phase C (sau Phase A environment + Phase B Babylon parallel)  
**Thư mục target:** `character-modules/` (chưa tạo)

---

## Ý tưởng

Thay vì tạo riêng từng character, build 1 **base character** đầy đủ rồi sản xuất hàng loạt variant qua config.

### Pipeline 1 lần cho base

```
raw/          → optimized/ (Blender MCP: weld, LOD, UV)
optimized/    → rigged/    (Blender: skeleton, weight paint)
rigged/       → animated/  (Blender: walk, run, idle, attack clips)
animated/     → production/ (gltf-transform: draco + texture compress)
```

### CharacterBase module

Load GLB base, expose API:
- `swapSkin(textureUrl)` — đổi albedo/normal texture
- `setMorphTarget(name, weight)` — chỉnh hình dạng mặt/body
- `attachOutfit(glbUrl)` — gắn outfit mesh vào bone attachment points
- `playAnimation(clipName, options)` — blend animations

### Mỗi variant = 1 JSON config

```json
{
  "id": "warrior_female",
  "skin": "assets/textures/skin_dark.ktx2",
  "morphs": { "muscleBlend": 0.6, "faceShape": "strong" },
  "outfit": "assets/props/armor_heavy/production/armor.glb",
  "defaultAnim": "idle_combat"
}
```

Không duplicate geometry/skeleton/animations — variant chỉ là config diff.

---

## Lợi ích

- Animation work (walk/run/idle) làm **1 lần**, toàn bộ variant thừa hưởng
- Thêm character mới = viết JSON, không cần pipeline lại
- VRAM tối ưu: geometry + skeleton dùng chung, chỉ texture là riêng

---

## Giới hạn — khi nào cần base mới

1 base = 1 **skeleton family**. Nếu cần:
- Quadruped (4 chân) → base riêng
- Robot không có spine → base riêng
- Creature với anatomy khác biệt → base riêng

Không cố ép 1 base cho tất cả — skeleton không tương thích thì animation không transfer được.

---

## Dependency trước khi implement

- Phase A hoàn tất (environment modules stable)
- `assets/characters/` có ít nhất 1 base GLB đã qua full pipeline
- `threejs-modules/` pattern đã ổn định (để biết structure cho character-modules/)
