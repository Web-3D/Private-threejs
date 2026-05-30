# Unify "holed wall geometry" (rect + ellip openings) thành 1 util dùng chung

## Bối cảnh

Kỹ thuật **trapezoid-band cắt lỗ chữ nhật + ellip** (front/back face + reveal tunnel + chord nghiêng
theo top/bottom → mượt, kín, ellipse THẬT clip thành bán nguyệt) hiện **lặp lại ~90 dòng** ở 2 chỗ
gần như y hệt:

1. `threejs-modules/components/InstancedBrickWall/index.ts` → `_buildBackingGeo` (nền vữa)
2. `01-Doraemon/src/world/building/parts/WallSingle.ts` → `_buildWallHolesGeo` + helpers
   (`_mapHoleOps`, `_holeChord`, `_solidTraps`, `_holeBoundsAt`, `_yCutsForHoles`, `_emitHoleBands`,
   `_emitOuterFaces`, `_emitHeadSill`) — dùng cho mọi tường phẳng (none + surface shader) khi có round.

`WoodSidingStrip` cũng cùng họ nhưng front z RĂNG CƯA (sawtooth) → biến thể, không gộp trực tiếp.

→ Đã đạt ngưỡng "≥3 nơi dùng" của rule Simplicity-Over-Abstraction → **nên** trích 1 util chung.

## Đề xuất

Tạo `threejs-modules/utils/holedWallGeometry/` (index.ts + meta.json + README + example):

```ts
buildHoledWallGeometry(opts: {
  w: number; h: number; depth: number
  openings: { x: number; y: number; w: number; h: number; round?: boolean }[]
  frontZ?: (y: number) => number   // optional: cho biến thể sawtooth (WoodSidingStrip)
}): THREE.BufferGeometry
```

- Mặc định front phẳng (zf cố định) → brick backing + WallSingle dùng.
- `frontZ` callback → WoodSidingStrip tái dùng (front răng cưa) nếu muốn gộp luôn.
- Trả `BufferGeometry` thuần (caller tự gắn material/instanced bricks).

Sau đó refactor cả 2 (rồi 3) chỗ gọi util → xoá code lặp.

## Vì sao HOÃN (không làm ngay)

- Cả 2 bản hiện **đang chạy đúng** (verify visual). Refactor module brick = sửa code đã ổn → rủi ro
  regression + phải re-validate brick. "Surgical changes" → không sửa tiện tay.
- Feature đang cần là "thêm round cho vật liệu còn lại" (đã xong) — không phải refactor.
- Làm khi: có nhu cầu tường-có-lỗ thứ 3, hoặc rảnh dọn nợ kỹ thuật. Khi làm: gộp test ellipse
  clip (bán nguyệt) + rect head/sill cho cả 2.

## Liên quan — wood-3d CHƯA cắt lỗ

`WoodSidingWall` (material `wood-3d`, `_assembleWoodWall` trong ArchPlanLab) **không cull/khoét lỗ
nào** (kể cả chữ nhật) — `openings` không được truyền vào. Muốn có cửa/sổ (rect hay round) ở wood-3d
phải thêm opening-cull + reveal cho InstancedMesh ván ngang — task riêng, lớn hơn. Cân nhắc: wood-3d
có cần cửa không, hay chỉ dùng `wood-strip` (đã đủ round) cho tường gỗ có cửa.
