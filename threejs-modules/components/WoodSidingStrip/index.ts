/**
 * VỊ TRÍ   — threejs-modules/components/WoodSidingStrip/index.ts
 * VAI TRÒ  — Tường ván gỗ ngang dạng "1 KHỐI" liền mạch: 1 BufferGeometry gấp khúc răng cưa
 *             (slant front của tấm dưới → step butt vuông góc của tấm trên, nối tiếp hết) + plane lưng.
 * LIÊN HỆ  — Material 'wood-strip' trong ArchPlanLab. Khác WoodSidingWall (InstancedMesh từng tấm):
 *             cái này là 1 mesh PLAIN → MERGE được xuyên tường/nhà → 1 draw call cho cả trăm nhà (scale).
 *
 * Hình: mặt cắt đứng = răng cưa. Mỗi tấm = 1 slant (front, reveal) + 1 step (mép butt nghiêng tilt) = 4 tris.
 *   + 1 plane lưng (2 tris) → tường kín. Mép butt = cạnh dài cố định QUAY theo tilt (±85°) → MƯỢT,
 *   không singularity (khác cách tan cũ lộn ở 90°). tilt − = overhang đổ bóng xuống slant dưới.
 *   Bóng từ ÁNH SÁNG THẬT (không tô baked); vertex color chỉ jitter màu/tấm. ~10 tấm ≈ 42 tris.
 *
 * DISPOSE: geo + mat — gọi dispose() khi gỡ tường.
 */

import * as THREE from 'three'

export interface WoodSidingStripOptions {
  width: number // m
  height: number // m
  depth?: number // m — bề dày tường (plane lưng ở -depth/2, front flush ở +depth/2). Default 0.1
  reveal?: number // m — chiều cao LỘ mỗi tấm (pitch). Default 0.32 (ván rộng)
  butt?: number // m — độ nhô mép dưới = run ngang của step. Default 0.045 (dày cho bóng đậm)
  stepTiltDeg?: number // độ — nghiêng mép butt (cạnh dài cố định quay): 0=phẳng, +dốc lên, −hắt xuống.
  // Phạm vi ±85 (mượt, KHÔNG singularity như 'tan ở 90°'). Default -35 (overhang nhẹ)
  woodColor?: THREE.ColorRepresentation // Default 0x9c6b3f
  backColor?: THREE.ColorRepresentation // màu plane lưng (trong nhà). Default 0x5c4026
  colorVariation?: number // jitter sáng/tối từng tấm [0-1]. Default 0.14
}

export class WoodSidingStrip {
  private geo: THREE.BufferGeometry | null = null
  private mat: THREE.MeshStandardMaterial | null = null
  private mesh: THREE.Mesh | null = null
  private triCount = 0
  private isDisposed = false

  constructor(opts: WoodSidingStripOptions) {
    const depth = opts.depth ?? 0.1
    const reveal = opts.reveal ?? 0.5 // ván rộng (reveal 500mm)
    const butt = opts.butt ?? 0.05 // butt 50mm
    const tiltRad = ((opts.stepTiltDeg ?? 0) * Math.PI) / 180 // 0 = step phẳng (vuông góc front)
    const wood = new THREE.Color(opts.woodColor ?? 0x9c6b3f)
    const back = new THREE.Color(opts.backColor ?? 0x5c4026)
    const variation = opts.colorVariation ?? 0.14

    this.geo = this._buildGeometry(opts.width, opts.height, { depth, reveal, butt, tiltRad, wood, back, variation })
    this.mat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.82 })
    const mesh = new THREE.Mesh(this.geo, this.mat)
    mesh.castShadow = true
    mesh.receiveShadow = true
    this.mesh = mesh
  }

  /** Mesh tường (1 khối). Thêm vào scene; tự đặt transform bên ngoài. */
  getMesh(): THREE.Mesh {
    if (!this.mesh) throw new Error('WoodSidingStrip: đã dispose')
    return this.mesh
  }

  getTriangleCount(): number {
    return this.triCount
  }

  dispose(): void {
    if (this.isDisposed) return
    this.mesh?.parent?.remove(this.mesh)
    this.geo?.dispose()
    this.mat?.dispose()
    this.mesh = null
    this.geo = null
    this.mat = null
    this.isDisposed = true
  }

  // ── Private ────────────────────────────────────────────────────────────────

  // 1 BufferGeometry: răng cưa front (slant+step mỗi tấm) + plane lưng. Vertex color = màu gỗ jitter
  // theo tấm × bóng baked (slant tối dần lên đỉnh, step tối nhất). computeVertexNormals → flat clapboard.
  private _buildGeometry(
    w: number,
    h: number,
    p: {
      depth: number
      reveal: number
      butt: number
      tiltRad: number
      wood: THREE.Color
      back: THREE.Color
      variation: number
    }
  ): THREE.BufferGeometry {
    const x2 = w / 2
    const zF = p.depth / 2 // flush (mặt tường)
    // Mép butt = cạnh dài cố định (= butt) QUAY theo tilt → mượt, không singularity:
    //   protrusion (zP) = butt·cos(tilt) — nhô giảm khi nghiêng; rise step = butt·sin(tilt) — bị chặn ±butt.
    const zP = zF + p.butt * Math.cos(p.tiltRad) // proud (mép butt nhô)
    const stepRise = p.butt * Math.sin(p.tiltRad) // +dốc lên, −hắt xuống; |rise| ≤ butt << reveal → slant>0
    const pos: number[] = []
    const col: number[] = []
    const idx: number[] = []
    let v = 0
    const quad = (c: number[][], k: number[][]): void => {
      for (let i = 0; i < 4; i++) {
        pos.push(c[i][0], c[i][1], c[i][2])
        col.push(k[i][0], k[i][1], k[i][2])
      }
      idx.push(v, v + 1, v + 2, v, v + 2, v + 3)
      v += 4
    }
    const tint = (base: THREE.Color, s: number): number[] => [base.r * s, base.g * s, base.b * s]

    const n = Math.max(1, Math.ceil(h / p.reveal))
    const slantH = p.reveal - stepRise // cao front (ys - y0)
    const fLen = Math.hypot(slantH, zP - zF) || 1 // độ dài front
    const ux = slantH / fLen // hướng front đi LÊN (về flush)
    const uz = (zF - zP) / fLen
    const r = Math.min(p.butt * 0.45, slantH * 0.25, 0.018) // bán kính bo mép butt
    const ROUND = 3 // số đoạn bezier bo
    // quad đùn ngang giữa 2 điểm mặt cắt a(ya,za)→b(yb,zb), màu ka→kb (b = phía trên/ngoài).
    const strip = (ya: number, za: number, yb: number, zb: number, ka: number[], kb: number[]): void =>
      quad([[-x2, ya, za], [x2, ya, za], [x2, yb, zb], [-x2, yb, zb]], [ka, ka, kb, kb])
    for (let i = 0; i < n; i++) {
      const y0 = i * p.reveal
      const ys = Math.min(y0 + slantH, h) // đỉnh slant (flush)
      const y1 = Math.min((i + 1) * p.reveal, h) // đỉnh step (proud) = đáy slant kế
      if (ys - y0 < 0.02) continue // tấm cuối quá mỏng → bỏ, tránh degenerate
      const j = 1 + (this._hash(i) - 0.5) * 2 * p.variation
      const c = p.wood.clone().multiplyScalar(j) // màu tấm (jitter) + baked bóng dưới đây
      const ck = tint(c, 1.0)
      const topK = tint(c, 0.15) // bóng ĐEN ĐẬM đỉnh front
      const edgeK = tint(c, 0.6) // bóng nhạt rìa step
      const last = y1 >= h - 1e-4
      // FRONT 2 dải bóng (đỉnh dồn đậm). Tấm >0: đáy front nhích lên r (đã bo từ corner dưới).
      const fy = i === 0 ? y0 : y0 + r * ux
      const fz = i === 0 ? zP : zP + r * uz
      const bandH = Math.min((ys - y0) * 0.35, 0.15)
      const yMid = ys - bandH
      const zMid = zP + (zF - zP) * ((yMid - y0) / (ys - y0))
      strip(fy, fz, yMid, zMid, ck, ck) // dải dưới sáng
      strip(yMid, zMid, ys, zF, ck, topK) // dải đỉnh đậm dần
      // STEP (butt underside, mặt -Y): inner (ys,zF) sáng → rìa cắt ngắn r chừa chỗ bo. winding riêng.
      const sLen = Math.hypot(y1 - ys, zP - zF) || 1
      const cut = last ? 0 : r
      const s1y = y1 - cut * ((y1 - ys) / sLen)
      const s1z = zP - cut * ((zP - zF) / sLen)
      const sc = [[-x2, ys, zF], [x2, ys, zF], [x2, s1y, s1z], [-x2, s1y, s1z]]
      const scc = [ck, ck, edgeK, edgeK]
      if (stepRise < 0) {
        sc.reverse()
        scc.reverse()
      }
      quad(sc, scc)
      if (last) continue
      // BO TRÒN mép butt: bezier S1 → tip(y1,zP) → P2(đáy front tấm kế = (y1,zP)+r·u). màu edgeK→ck.
      const p2y = y1 + r * ux
      const p2z = zP + r * uz
      let py = s1y
      let pz = s1z
      let pk = edgeK
      for (let s = 1; s <= ROUND; s++) {
        const t = s / ROUND
        const mt = 1 - t
        const qy = mt * mt * s1y + 2 * mt * t * y1 + t * t * p2y
        const qz = mt * mt * s1z + 2 * mt * t * zP + t * t * p2z
        const qk = tint(c, 0.6 + 0.4 * t)
        strip(py, pz, qy, qz, pk, qk)
        py = qy
        pz = qz
        pk = qk
      }
    }
    // plane lưng (trong nhà), mặt -Z
    quad(
      [
        [x2, 0, -zF],
        [-x2, 0, -zF],
        [-x2, h, -zF],
        [x2, h, -zF],
      ],
      [tint(p.back, 1), tint(p.back, 1), tint(p.back, 1), tint(p.back, 1)]
    )

    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3))
    geo.setAttribute('color', new THREE.Float32BufferAttribute(col, 3))
    geo.setIndex(idx)
    geo.computeVertexNormals()
    this.triCount = idx.length / 3
    return geo
  }

  private _hash(i: number): number {
    const s = Math.sin(i * 91.7 + 13.2) * 43758.5453
    return s - Math.floor(s)
  }
}
