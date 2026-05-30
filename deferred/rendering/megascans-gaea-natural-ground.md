# megascans-gaea-natural-ground — đất/cỏ/đá từ Quixel Megascans + Gaea

> User chốt 2026-05-30: bề mặt TỰ NHIÊN (đất/cỏ/đá/sỏi) KHÔNG làm procedural nữa — dùng
> **Quixel Megascans** (photoscan PBR) + **Gaea** (địa hình). Procedural GIỮ cho bề mặt nhân tạo
> (brick/concrete/wood/metal/asphalt/stone). Dừng SandGround/DirtRockGround procedural.
> Revisit khi: có asset Megascans/Gaea import vào `../assets/`.

---

## Vì sao tách (procedural vs scan)

- Procedural thắng ở bề mặt có quy luật (gạch/bê tông/nhựa/kim loại/đá lát) — đã làm đẹp.
- Procedural thua ở hữu cơ (cỏ → "bánh kem" sau nhiều vòng; đất/đá tương tự). Megascans photoscan
  cho chất tự nhiên ngay, đỡ hàng tuần tinh chỉnh. Đây là lằn ranh UE5+Megascans dùng.

## Megascans giải 2 nỗi lo cũ
- **Shimmer**: texture có mipmap → hết lấp lánh ở xa (procedural noise không có mipmap, phải LOD thủ công).
- **Perf nhiều nhà**: 1–4 sample/fragment thay vì hàng chục octave noise.

## Pipeline tích hợp (đã định hướng)

1. **Megascans surface** (grass/dirt/rock/gravel): tải về bộ map albedo/normal/roughness/AO (+ displacement).
   - Xử lý qua Factory pipeline → resize + nén **KTX2/Basis** cho web (giảm VRAM).
   - Đặt vào `../assets/textures/[name]/` + REGISTRY.
2. **Material**: TÁI DÙNG path triplanar-texture của `brick-tex` trong ArchPlanLab —
   `triplanarTexture(albedo/rough/ao)` + normal map (Megascans có normal thật → reorient triplanar,
   hoặc tạm dùng perturbNormalFromHeight từ displacement). Mipmap sẵn → hết shimmer.
3. **Gaea terrain** (tùy chọn, sau): heightmap PNG/EXR từ Gaea → vertex-displace PlaneGeometry
   (TerrainSystem); Gaea splat masks → blend nhiều Megascans material theo độ dốc/cao độ
   (cỏ phẳng, đá dốc, đất xen). getHeightAt(x,z) cho đặt công trình.
4. **Ground type mới** trong ArchPlanLab: 'grass-scan' / 'dirt-scan' / 'rock-scan' → load bộ Megascans
   tương ứng. Giữ procedural grass/asphalt/stone làm option nhẹ không-cần-asset.

## Trạng thái hiện tại (giữ lại)
- Procedural ground giữ: `shaders/ground/AsphaltGround` (nhựa đường), stone = reuse ConcretePanel (đá lát).
- **GrassGround procedural ĐÃ XOÁ** (2026-05-30) — cỏ procedural nhìn giả tạo / thiếu chiều sâu
  dù đã thử AO đa tầng + loang mạnh. Cỏ/đất CHỜ Megascans (photoscan hợp hữu cơ hơn hẳn).
- Khung ground trong ArchPlanLab (`_setGroundType`/`_makeGroundMaterial` + panel 🌱 Ground) — sẵn sàng
  cắm thêm ground type Megascans (vd 'grass-scan'/'rock-scan').

## Liên hệ
- [[bake-procedural-to-texture]] — bake procedural→texture cũng cho mipmap; Megascans là nguồn texture có sẵn.
- Factory pipeline: `c:\Factory\CLAUDE.md` (bake/format/export), `../assets/` (KTX2 output).
- TerrainSystem (skill new-module ARGUMENTS) — heightmap displace, getHeightAt, LOD.
