# shader-reveal-groove — ĐÃ THỬ & BỎ (2026-05-30)

> Cách B (reveal/panel control-joint lõm GIẢ bằng shader, world-space groove + perturbNormalFromHeight)
> đã code xong, build sạch, nhưng **NgQuan bỏ** sau khi xem: "không ra hình rồi, có thể chỉnh trực
> tiếp trên texture luôn". → Reveal/groove decor thuộc **khâu texture/Megascans**, không procedural.

---

## Đã làm gì (để khỏi làm lại)
- `revealGrooveNode(style)` trong ArchPlanLab: world-space, đường ngang theo `positionWorld.y`,
  đường dọc theo `mix(p.x, p.z, step(n.z, n.x))` (tự chọn trục X/Z theo hướng tường axis-aligned).
- Composite vào `makeSurfaceMaterial`: `colorNode.mul(ao)` (rãnh tối ~50%) + `mix(baseNormal,
  perturbNormalFromHeight(height), mask)` (chỉ lệch normal trong rãnh).
- `style` đưa vào `_wallKey` để merge riêng.

## Vì sao bỏ
1. **Không nổi hình** ở khoảng cách kiến trúc + nắng hiện tại — groove giả quá tinh tế, không bõ.
2. **Texture chỉnh trực tiếp gọn hơn**: reveal line / panel groove vẽ thẳng vào normal/displacement
   map (Megascans hoặc bake) — đúng pipeline đã chốt cho bề mặt, không cần node procedural riêng.
3. Trùng định hướng [[megascans-gaea-natural-ground]]: chi tiết bề mặt → texture, không procedural.

## Còn lại
- `style: 'flat'|'reveal'|'panel'` GIỮ trong SegmentState (placeholder) — sẽ dùng cho **cách A**
  (geometry recess THẬT) cho chi tiết decor nhỏ / tấm gỗ, KHÔNG phải shader. Nhãn GUI: `Style [→A]`.
- Nếu sau cần reveal trên tường lớn → vẽ vào texture, đừng dựng lại shader groove này.
