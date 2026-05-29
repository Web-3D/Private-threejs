# bake-procedural-to-texture — bake shader procedural → texture mipmapped (production)

> User chốt 2026-05-30: **chưa làm bây giờ**. Editor giữ procedural (live-edit). Bake ở **production phase**.
> Revisit khi: chuẩn bị render production / export công trình (BuildingFromPlan trong World), hoặc khi
> cảnh nhiều nhà (>~50) tụt frame, hoặc cần khử shimmer triệt để.

---

## Vì sao bake (2 vấn đề procedural không tự giải)

1. **Shimmer ở xa** — fbm/triNoise procedural **không có mipmap** → mọi normal/roughness tần số cao alias
   khi 1 pixel trùm nhiều chu kỳ. Phải tự LOD-fade từng nguồn (whack-a-mole). Texture mipmapped khử 1 phát.
2. **Perf nhiều nhà** — cost = ALU/fragment × pixel phủ. Shader nặng (~7 triNoise + 4 fbm 3-octave/fragment).
   Tường lớn phủ kín màn hình + dpr=2 (~8M fragment) → nguy cơ tụt frame. Texture = 1–4 sample, rẻ hơn nhiều.

Procedural KHÔNG phí — nó là **nguồn để bake**.

## API đã verify (three r174, trong 01-Doraemon/node_modules/three)

- `rtt()` / `convertToTexture()` (three/tsl) = **post-FX screen-space**, KHÔNG dùng được cho shader
  world-space triplanar (trong RTT pass `positionWorld` vô nghĩa). → KHÔNG đi đường này.
- Đường đúng = **render PlaneGeometry world-space vào RenderTarget**:
  - `new THREE.RenderTarget(res, res, { generateMipmaps: true, minFilter: LinearMipmapLinearFilter, wrapS/T: RepeatWrapping, depthBuffer: false })`
  - WebGPU backend **có sinh mipmap** cho RT (`WebGPUTextureUtils` / `WebGPUTexturePassUtils` / `WebGPUBackend.js`).
  - PlaneGeometry đặt sao cho `positionWorld.xy ∈ [0,S]²` tại z=0, normal +Z → triplanar chỉ lấy XY projection.
  - `OrthographicCamera(0, S, S, 0, -1, 1)` nhìn xuống, `await renderer.renderAsync(bakeScene, cam)`.

## Kiến trúc bake (kế hoạch đã chốt)

| Bước | Việc |
|---|---|
| 1 | Mỗi shader expose `getHeightNode()` (scalar height: mask + micro) để bake height map |
| 2 | Util `bakeSurface(renderer, {colorNode, roughnessNode, heightNode}, sizeWorld, res)` → render 3 RT (color/rough/height), mipmap, RepeatWrapping |
| 3 | Runtime material = **tái dùng path brick-tex**: `MeshStandardNodeMaterial` + `triplanarTexture(colorTex)` + `triplanarTexture(roughTex).x` + `perturbNormalFromHeight(triplanarTexture(heightTex).x)` (helper đã có trong ArchPlanLab) |
| 4 | Cache theo registry-key (material+color+scale); **re-bake khi đổi param** (1 frame async) → vẫn live-edit; dispose RT khi key không dùng |
| 5 | Spike brick: so shimmer xa + đo RuntimeGuard rẻ hơn? → roll out 3 cái |

## Lưu ý / tradeoff

- **Tiling**: patch S×S lặp mỗi S mét. Chọn S lớn (~3–4m) để ít lộ. Grid gạch/panel chia hết S thì liền;
  noise (mottle/fbm) KHÔNG seamless ở biên tile → seam mờ mỗi S. Chấp nhận, hoặc dùng tileable noise.
- **Normal**: KHÔNG bake được view-space normal (perturbNormal phụ thuộc camera). → bake HEIGHT, derive
  normal lúc runtime từ height mipmapped (perturbNormalFromHeight) → vẫn có bump + hết shimmer (height đã mip-filter).
- **AO**: hiện đã nhân sẵn vào colorNode → baked color đã gồm AO. Không cần map AO riêng v1.
- Khi bake xong, các LOD-fade thủ công trong shader (vd brick `_buildNormalNode` fwidth LOD) thành thừa → có thể gỡ.

## Liên hệ
- [[procedural-brick-cracks]] — nứt brick cũng hoãn, làm lúc nghiên cứu shader sâu.
- `archplan-ap5-extensions` (deferred/systems) — World render / BuildingFromPlan áp material.
