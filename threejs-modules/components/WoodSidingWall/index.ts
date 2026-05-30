/**
 * VỊ TRÍ   — threejs-modules/components/WoodSidingWall/index.ts
 * VAI TRÒ  — Tường ván gỗ ngang (clapboard/lap siding) GEOMETRY THẬT: ~8–20 tấm ván dài chồng mép,
 *             mỗi tấm nghiêng ra (mép dưới nhô) → bóng đổ + dáng ván thật. InstancedMesh = 1 draw call.
 * LIÊN HỆ  — Material 'wood-3d' trong ArchPlanLab. Ca lý tưởng cho instanced (ít mảnh, cực rẻ).
 *
 * Tối ưu mặt (theo NgQuan): mỗi tấm còn 2 mặt = 4 tris (bỏ MẶT SAU úp tường + MẶT TRÊN luồn dưới
 * tấm trên + 2 MẶT ĐẦU ở góc tường khuất). ~13 tấm × 4 = ~64 tris/tường → rẻ gấp ~200× brick → DÙNG
 * ĐẠI TRÀ được. (Mặt đầu chỉ lộ khi đầu hồi hở không có tường kề.)
 *
 * DISPOSE: backing + plank geo/mat — gọi dispose() khi gỡ tường.
 */

import * as THREE from 'three'

export interface WoodSidingWallOptions {
  width: number // m
  height: number // m
  depth?: number // m — nền sau (solidity, khuất sau ván). Default 0.1
  plankExposed?: number // m — chiều cao LỘ mỗi tấm (reveal). Default 0.235 (ván rộng bản)
  plankOverlap?: number // m — mép tấm chồng lên tấm dưới. Default 0.035
  plankProtrude?: number // m — bề dày mép dưới (butt) nhô. Default 0.018
  tiltDeg?: number // độ — nghiêng tấm ra ngoài (clapboard). Default 6
  woodColor?: THREE.ColorRepresentation // Default 0x9c6b3f
  colorVariation?: number // jitter sáng/tối từng tấm [0-1]. Default 0.14
}

export class WoodSidingWall {
  private group: THREE.Group | null = null
  private backingGeo: THREE.BoxGeometry | null = null
  private backingMat: THREE.MeshStandardMaterial | null = null
  private plankGeo: THREE.BoxGeometry | null = null
  private plankMat: THREE.MeshStandardMaterial | null = null
  private instanced: THREE.InstancedMesh | null = null
  private plankCount = 0
  private isDisposed = false

  constructor(opts: WoodSidingWallOptions) {
    const depth = opts.depth ?? 0.1
    const exposed = opts.plankExposed ?? 0.235 // ván rộng bản (reveal 235mm)
    const overlap = opts.plankOverlap ?? 0.035 // lap chồng 35mm
    const thick = opts.plankProtrude ?? 0.018 // butt mép dày 18mm (gần max realistic)
    const tilt = ((opts.tiltDeg ?? 6) * Math.PI) / 180

    const group = new THREE.Group()
    this._buildBacking(group, opts.width, opts.height, depth, opts.woodColor ?? 0x9c6b3f)
    this._buildPlanks(group, opts, { depth, exposed, overlap, thick, tilt })
    this.group = group
  }

  getGroup(): THREE.Group {
    if (!this.group) throw new Error('WoodSidingWall: đã dispose')
    return this.group
  }

  getPlankCount(): number {
    return this.plankCount
  }

  /** Tổng triangle (ván ×4 — 2 mặt: front+bottom — + nền 12). */
  getTriangleCount(): number {
    return this.plankCount * 4 + 12
  }

  dispose(): void {
    if (this.isDisposed) return
    this.group?.parent?.remove(this.group)
    this.backingGeo?.dispose()
    this.backingMat?.dispose()
    this.plankGeo?.dispose()
    this.plankMat?.dispose()
    this.instanced?.dispose()
    this.group = null
    this.backingGeo = null
    this.backingMat = null
    this.plankGeo = null
    this.plankMat = null
    this.instanced = null
    this.isDisposed = true
  }

  // ── Private ────────────────────────────────────────────────────────────────

  private _buildBacking(
    group: THREE.Group,
    w: number,
    h: number,
    depth: number,
    woodColor: THREE.ColorRepresentation
  ): void {
    this.backingGeo = new THREE.BoxGeometry(w, h, depth)
    const c = new THREE.Color(woodColor).multiplyScalar(0.6) // nền tối hơn ván (khe hở)
    this.backingMat = new THREE.MeshStandardMaterial({ color: c, roughness: 0.92 })
    const mesh = new THREE.Mesh(this.backingGeo, this.backingMat)
    mesh.position.set(0, h / 2, 0)
    mesh.castShadow = true
    mesh.receiveShadow = true
    group.add(mesh)
  }

  // InstancedMesh tấm ván: box (width × fullH × thick) bỏ mặt sau + mặt trên (4 mặt), nghiêng tiltX,
  // chồng mép (fullH = exposed + overlap). Mép dưới nhô → bóng đổ; mép trên luồn dưới tấm trên.
  private _buildPlanks(
    group: THREE.Group,
    opts: WoodSidingWallOptions,
    p: { depth: number; exposed: number; overlap: number; thick: number; tilt: number }
  ): void {
    const w = opts.width
    const h = opts.height
    const fullH = p.exposed + p.overlap
    const n = Math.max(1, Math.ceil(h / p.exposed))
    this.plankCount = n

    this.plankGeo = new THREE.BoxGeometry(w, fullH, p.thick)
    this._trimFaces(this.plankGeo, fullH, p.thick, w) // bỏ sau + trên + 2 đầu → 2 mặt = 4 tris
    this._bakeLapShadow(this.plankGeo, fullH) // bóng tấm-trên-đè baked (shadow map quá thô cho ~9mm)
    this.plankMat = new THREE.MeshStandardMaterial({ roughness: 0.82, vertexColors: true })
    const inst = new THREE.InstancedMesh(this.plankGeo, this.plankMat, n)
    inst.castShadow = true
    inst.receiveShadow = true

    const base = new THREE.Color(opts.woodColor ?? 0x9c6b3f)
    const variation = opts.colorVariation ?? 0.14
    // tilt ÂM: mép DƯỚI nhô +Z (butt proud), mép trên thụt -Z (luồn sau tấm trên) → tấm trên đè
    // tấm dưới đúng kiểu lap siding (lắp dưới lên). tilt dương sẽ ngược (tấm dưới đè tấm trên).
    const rot = new THREE.Matrix4().makeRotationX(-p.tilt)
    const m = new THREE.Matrix4()
    const c = new THREE.Color()
    const zc = p.depth / 2 + p.thick / 2
    for (let i = 0; i < n; i++) {
      const yc = i * p.exposed + fullH / 2
      m.makeTranslation(0, yc, zc).multiply(rot)
      inst.setMatrixAt(i, m)
      const j = 1 + (this._hash(i) - 0.5) * 2 * variation
      inst.setColorAt(i, c.copy(base).multiplyScalar(j))
    }
    inst.instanceMatrix.needsUpdate = true
    if (inst.instanceColor) inst.instanceColor.needsUpdate = true
    this.instanced = inst
    group.add(inst)
  }

  // Bake "shadow line" clapboard vào vertex color: tối dần lên đỉnh tấm (vùng bị tấm trên đè che).
  // Shadow map mặt trời quá thô (~39mm/texel) để vẽ bóng ~9mm giữa 2 tấm → bake cho chắc, luôn hiện.
  // Kết hợp instanceColor (màu gỗ/tấm) × vertexColor (gradient bóng) trong MeshStandardMaterial.
  private _bakeLapShadow(geo: THREE.BoxGeometry, fullH: number): void {
    const pos = geo.attributes.position
    const col = new Float32Array(pos.count * 3)
    const ss = (a: number, b: number, x: number): number => {
      const t = Math.min(1, Math.max(0, (x - a) / (b - a)))
      return t * t * (3 - 2 * t)
    }
    for (let i = 0; i < pos.count; i++) {
      const ty = (pos.getY(i) + fullH / 2) / fullH // 0 đáy … 1 đỉnh
      const b = 1 - 0.6 * ss(0.5, 0.92, ty) // tối ~40% phía trên reveal = bóng tấm trên đổ xuống
      col[i * 3] = b
      col[i * 3 + 1] = b
      col[i * 3 + 2] = b
    }
    geo.setAttribute('color', new THREE.BufferAttribute(col, 3))
  }

  // Bỏ 4 mặt khuất → còn front (+Z) + bottom (-Y) = 2 mặt = 4 tris/tấm:
  //   -Z (sau, úp tường) · +Y (trên, luồn dưới tấm trên) · ±X (2 đầu, ở góc tường — khuất bởi tường kề).
  // LƯU Ý: mặt đầu chỉ lộ nếu tường KHÔNG có tường kề che góc (đầu hồi hở) → khi đó thấy lưng tấm.
  private _trimFaces(geo: THREE.BoxGeometry, fullH: number, thick: number, width: number): void {
    const pos = geo.attributes.position
    const idx = geo.index
    if (!idx) return
    const backZ = -thick / 2 + 1e-6
    const topY = fullH / 2 - 1e-6
    const sideX = width / 2 - 1e-6
    const keep: number[] = []
    for (let t = 0; t < idx.count; t += 3) {
      const a = idx.getX(t)
      const b = idx.getX(t + 1)
      const c = idx.getX(t + 2)
      const back = pos.getZ(a) < backZ && pos.getZ(b) < backZ && pos.getZ(c) < backZ
      const top = pos.getY(a) > topY && pos.getY(b) > topY && pos.getY(c) > topY
      const right = pos.getX(a) > sideX && pos.getX(b) > sideX && pos.getX(c) > sideX
      const left = pos.getX(a) < -sideX && pos.getX(b) < -sideX && pos.getX(c) < -sideX
      if (back || top || right || left) continue // mặt khuất → bỏ
      keep.push(a, b, c)
    }
    geo.setIndex(keep)
  }

  private _hash(i: number): number {
    const s = Math.sin(i * 91.7 + 13.2) * 43758.5453
    return s - Math.floor(s)
  }
}
