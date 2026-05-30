/**
 * VỊ TRÍ   — threejs-modules/components/WoodSidingStrip/index.ts
 * VAI TRÒ  — Tường ván gỗ ngang dạng "1 KHỐI" liền mạch: 1 BufferGeometry gấp khúc răng cưa
 *             (slant front của tấm dưới → step butt vuông góc của tấm trên, nối tiếp hết) + plane lưng.
 * LIÊN HỆ  — Material 'wood-strip' trong ArchPlanLab. Khác WoodSidingWall (InstancedMesh từng tấm):
 *             cái này là 1 mesh PLAIN → MERGE được xuyên tường/nhà → 1 draw call cho cả trăm nhà (scale).
 *
 * Hình: mặt cắt đứng = răng cưa. Mỗi tấm = 1 slant (front, reveal) + 1 step (mép butt nghiêng tilt) = 4 tris.
 *   + plane lưng + 2 mặt bên ±X (cap silhouette) + mặt trên/dưới ±Y → HỘP KÍN 6 MẶT (front răng cưa
 *   là 1 trong 6 mặt). Mép butt = cạnh dài cố định QUAY theo tilt (±85°) → MƯỢT,
 *   không singularity (khác cách tan cũ lộn ở 90°). tilt − = overhang đổ bóng xuống slant dưới.
 *   Bóng từ ÁNH SÁNG THẬT (không tô baked); vertex color chỉ jitter màu/tấm. ~10 tấm ≈ 42 tris.
 *   OPENINGS (cửa/sổ): band() chia dải tại mép lỗ → chỉ vẽ khoảng X đặc; jamb trái/phải do band() phát
 *   theo z front (XIÊN đúng góc slant từng dải, đúng mặt cắt) + head/sill ngang bám frontZ → bịt hốc rỗng.
 *
 * DISPOSE: geo + mat — gọi dispose() khi gỡ tường.
 */

import * as THREE from 'three'

// Lỗ cửa/cửa sổ — toạ độ MÉT. x tính từ MÉP TRÁI tường, y từ CHÂN tường.
export interface WoodStripOpening {
  x: number // m — mép trái lỗ tính từ đầu trái tường
  y: number // m — mép dưới lỗ tính từ chân tường (cửa = 0; cửa sổ = chiều cao bệ)
  w: number // m
  h: number // m
  round?: boolean // true = lỗ ELLIP (fit bbox w×h) thay vì chữ nhật. Default false
}

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
  openings?: WoodStripOpening[] // lỗ cửa/sổ — clip dải gỗ + bịt jamb reveal. Default []
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
    const openings = opts.openings ?? []

    this.geo = this._buildGeometry(opts.width, opts.height, { depth, reveal, butt, tiltRad, wood, back, variation, openings })
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
      openings: WoodStripOpening[]
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
    const prof: number[][] = [] // điểm silhouette mặt trước [y, z, r, g, b] → cap 2 mặt bên
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

    // Lỗ cửa/sổ → local [xa,xb]×[y0,y1], clamp vào tường. round = ellip fit bbox. Bỏ lỗ suy biến.
    const ops = p.openings
      .map((o) => ({
        xa: Math.max(-x2, -x2 + o.x),
        xb: Math.min(x2, -x2 + o.x + o.w),
        y0: Math.max(0, o.y),
        y1: Math.min(h, o.y + o.h),
        round: o.round ?? false,
      }))
      .filter((o) => o.xb - o.xa > 1e-4 && o.y1 - o.y0 > 1e-4)
    type Op = (typeof ops)[number]
    const lerpK = (a: number[], b: number[], t: number): number[] => [
      a[0] + (b[0] - a[0]) * t,
      a[1] + (b[1] - a[1]) * t,
      a[2] + (b[2] - a[2]) * t,
    ]
    // Khoảng X bị KHOÉT của 1 lỗ tại độ cao yy. rect = [xa,xb]; round = chord ellip. null = không cắt.
    const holeSpan = (o: Op, yy: number): [number, number] | null => {
      if (yy <= o.y0 || yy >= o.y1) return null
      if (!o.round) return [o.xa, o.xb]
      const cx = (o.xa + o.xb) / 2
      const cy = (o.y0 + o.y1) / 2
      const k = 1 - ((yy - cy) / ((o.y1 - o.y0) / 2)) ** 2 // 1 − (t)²
      if (k <= 0) return null
      const hw = ((o.xb - o.xa) / 2) * Math.sqrt(k)
      return [cx - hw, cx + hw]
    }
    // Khoảng X đặc tại độ cao yy = full width trừ các lỗ đang cắt ngang yy.
    const solidSpans = (yy: number): number[][] => {
      let spans: number[][] = [[-x2, x2]]
      for (const o of ops) {
        const hs = holeSpan(o, yy)
        if (!hs) continue
        spans = spans.flatMap(([a, b]) => {
          const i0 = Math.max(a, hs[0])
          const i1 = Math.min(b, hs[1])
          if (i1 <= i0) return [[a, b]]
          const out: number[][] = []
          if (a < i0 - 1e-6) out.push([a, i0])
          if (i1 + 1e-6 < b) out.push([i1, b])
          return out
        })
      }
      return spans
    }
    // JAMB ANGLED: nối mép front nghiêng (xB,ya,za)→(xT,yb,zb) → lưng (−zF). plus = normal +X.
    const jambKcol = tint(p.wood, 0.5)
    const jambQuad = (xB: number, xT: number, ya: number, za: number, yb: number, zb: number, plus: boolean): void => {
      const fa = [xB, ya, za]
      const fb = [xT, yb, zb]
      const ba = [xB, ya, -zF]
      const bb = [xT, yb, -zF]
      const k = jambKcol
      if (plus) quad([ba, bb, fb, fa], [k, k, k, k])
      else quad([fa, fb, bb, ba], [k, k, k, k])
    }
    // Chord lỗ tại yy cho hình thang (round THU VỀ ĐIỂM cx ở 2 cực, không null trong [y0,y1]).
    const holeChord = (o: Op, yy: number): [number, number] | null => {
      if (yy < o.y0 - 1e-9 || yy > o.y1 + 1e-9) return null
      if (!o.round) return [o.xa, o.xb]
      const cx = (o.xa + o.xb) / 2
      const cy = (o.y0 + o.y1) / 2
      const kk = 1 - ((yy - cy) / ((o.y1 - o.y0) / 2)) ** 2
      const hw = ((o.xb - o.xa) / 2) * Math.sqrt(Math.max(0, kk))
      return [cx - hw, cx + hw]
    }
    // Hình thang ĐẶC của band [ya,yb]: trừ trapezoid lỗ — mép lỗ NGHIÊNG theo chord top/bottom → MƯỢT
    // + KÍN (không bậc/riser). jL/jR = cạnh trái/phải là mép lỗ (cần jamb). Giả định lỗ không chồng x.
    type Trap = { lB: number; lT: number; rB: number; rT: number; jL: boolean; jR: boolean }
    const solidTraps = (ya: number, yb: number): Trap[] => {
      const ht: { lB: number; lT: number; rB: number; rT: number; c: number }[] = []
      for (const o of ops) {
        const b = holeChord(o, ya)
        const t = holeChord(o, yb)
        if (!b && !t) continue
        const lB = b ? b[0] : t![0]
        const lT = t ? t[0] : b![0]
        const rB = b ? b[1] : t![1]
        const rT = t ? t[1] : b![1]
        ht.push({ lB, lT, rB, rT, c: (lB + rB) / 2 })
      }
      ht.sort((a, b) => a.c - b.c)
      const out: Trap[] = []
      let cB = -x2
      let cT = -x2
      for (const hl of ht) {
        if (hl.lB > cB + 1e-6 || hl.lT > cT + 1e-6) {
          out.push({ lB: cB, lT: cT, rB: hl.lB, rT: hl.lT, jL: cB > -x2 + 1e-6 || cT > -x2 + 1e-6, jR: true })
        }
        cB = Math.max(cB, hl.rB)
        cT = Math.max(cT, hl.rT)
      }
      out.push({ lB: cB, lT: cT, rB: x2, rT: x2, jL: cB > -x2 + 1e-6 || cT > -x2 + 1e-6, jR: false })
      return out.filter((t) => t.rB - t.lB > 1e-6 || t.rT - t.lT > 1e-6)
    }
    // Đùn band (yA,zA,kA)→(yB,zB,kB): chia Y (round mịn ~25mm) → mỗi sub-band dựng HÌNH THANG đặc (mép
    // lỗ nghiêng theo chord → mượt/kín) + jamb angled. Không lỗ → 1 hình thang = full width như cũ.
    const band = (yA: number, zA: number, kA: number[], yB: number, zB: number, kB: number[], back = false): void => {
      const lo = Math.min(yA, yB)
      const hi = Math.max(yA, yB)
      if (hi - lo < 1e-6) return
      const cuts = [lo, hi]
      const addCut = (yc: number): void => void (yc > lo + 1e-6 && yc < hi - 1e-6 && cuts.push(yc))
      for (const o of ops) {
        addCut(o.y0)
        addCut(o.y1)
        if (o.round) {
          const ns = Math.max(2, Math.ceil((o.y1 - o.y0) / 0.025))
          for (let s = 1; s < ns; s++) addCut(o.y0 + ((o.y1 - o.y0) * s) / ns)
        }
      }
      cuts.sort((a, b) => a - b)
      const dy = yB - yA || 1
      for (let k = 0; k < cuts.length - 1; k++) {
        const ya2 = cuts[k]
        const yb2 = cuts[k + 1]
        if (yb2 - ya2 < 1e-6) continue
        const ta = (ya2 - yA) / dy
        const tb = (yb2 - yA) / dy
        const za2 = zA + (zB - zA) * ta
        const zb2 = zA + (zB - zA) * tb
        const ka2 = lerpK(kA, kB, ta)
        const kb2 = lerpK(kA, kB, tb)
        for (const tr of solidTraps(ya2, yb2)) {
          if (back) {
            quad([[tr.rB, ya2, za2], [tr.lB, ya2, za2], [tr.lT, yb2, zb2], [tr.rT, yb2, zb2]], [ka2, ka2, kb2, kb2])
            continue
          }
          quad([[tr.lB, ya2, za2], [tr.rB, ya2, za2], [tr.rT, yb2, zb2], [tr.lT, yb2, zb2]], [ka2, ka2, kb2, kb2])
          if (tr.jL) jambQuad(tr.lB, tr.lT, ya2, za2, yb2, zb2, false) // cạnh trái = mép phải lỗ → −X
          if (tr.jR) jambQuad(tr.rB, tr.rT, ya2, za2, yb2, zb2, true) // cạnh phải = mép trái lỗ → +X
        }
      }
    }

    const n = Math.max(1, Math.ceil(h / p.reveal))
    const slantH = p.reveal - stepRise // cao front (ys - y0)
    // z mặt front NGOÀI tại độ cao y (sawtooth: zP proud ở đáy tấm → zF flush lên đỉnh). Cho head/sill lỗ.
    const frontZ = (y: number): number => {
      const yy = Math.min(Math.max(y, 0), h)
      const t = Math.min(1, (yy - Math.floor(yy / p.reveal) * p.reveal) / slantH)
      return zP + (zF - zP) * t
    }
    // quad đùn ngang giữa 2 điểm mặt cắt a(ya,za)→b(yb,zb), màu ka→kb (b = phía trên/ngoài). Khoét lỗ qua band().
    const strip = (ya: number, za: number, yb: number, zb: number, ka: number[], kb: number[]): void =>
      band(ya, za, ka, yb, zb, kb)
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
      const capK = tint(c, 0.5) // mặt bên (end-grain) — tối hơn front
      // FRONT 2 dải bóng (đỉnh dồn đậm). MÉP SẮC (không bo): đáy front = (y0,zP) = mũi step tấm dưới.
      prof.push([y0, zP, capK[0], capK[1], capK[2]]) // silhouette: đáy front (proud, sắc)
      const bandH = Math.min((ys - y0) * 0.35, 0.15)
      const yMid = ys - bandH
      const zMid = zP + (zF - zP) * ((yMid - y0) / (ys - y0))
      strip(y0, zP, yMid, zMid, ck, ck) // dải dưới sáng
      strip(yMid, zMid, ys, zF, ck, topK) // dải đỉnh đậm dần
      prof.push([ys, zF, capK[0], capK[1], capK[2]]) // silhouette: đỉnh front (flush)
      // STEP (butt underside, mặt -Y): từ (ys,zF) → mũi proud (y1,zP) SẮC. band Y-sort tự đảo winding overhang.
      prof.push([y1, zP, capK[0], capK[1], capK[2]]) // silhouette: mũi step (proud, sắc)
      band(ys, zF, ck, y1, zP, edgeK)
    }
    // 2 MẶT BÊN (±X): nối silhouette front → plane lưng (z=-zF). Winding tính tay → normal hướng ra.
    //   phải (+x2): [Ba,Bb,Fb,Fa] → +X. trái (-x2): đảo [Fa,Fb,Bb,Ba] → −X. ~3 điểm/tấm, rẻ.
    const capQuad = (side: number, a: number[], b: number[]): void => {
      const x = side * x2
      const fa = [x, a[0], a[1]]
      const fb = [x, b[0], b[1]]
      const ba = [x, a[0], -zF]
      const bb = [x, b[0], -zF]
      const ka = [a[2], a[3], a[4]]
      const kb = [b[2], b[3], b[4]]
      if (side > 0) quad([ba, bb, fb, fa], [ka, kb, kb, ka])
      else quad([fa, fb, bb, ba], [ka, kb, kb, ka])
    }
    for (let i = 0; i < prof.length - 1; i++) {
      capQuad(1, prof[i], prof[i + 1])
      capQuad(-1, prof[i], prof[i + 1])
    }
    // plane lưng (trong nhà, mặt −Z) — KHOÉT lỗ cửa/sổ qua band(back=true)
    const backK = tint(p.back, 1)
    band(0, -zF, backK, h, -zF, backK, true)
    // JAMB reveal: left/right ĐÃ do band() phát (bám z front răng cưa, xiên đúng góc slant). Ở đây chỉ
    // còn HEAD (đầu, −Y) + SILL (bệ, +Y): mặt ngang nối front z=frontZ(mép) → lưng (−zF). Bám đúng mặt cắt.
    const jk4 = [jambKcol, jambKcol, jambKcol, jambKcol]
    for (const o of ops) {
      if (o.round) continue // tròn không có head/sill ngang — jamb band đã bao quanh chu vi ellip
      const zBot = frontZ(o.y0)
      const zTop = frontZ(o.y1)
      quad([[o.xa, o.y0, -zF], [o.xa, o.y0, zBot], [o.xb, o.y0, zBot], [o.xb, o.y0, -zF]], jk4) // bệ +Y
      quad([[o.xb, o.y1, -zF], [o.xb, o.y1, zTop], [o.xa, o.y1, zTop], [o.xa, o.y1, -zF]], jk4) // đầu −Y
    }
    // 2 MẶT TRÊN & DƯỚI (±Y) → đóng kín HỘP 6 MẶT. Phẳng z∈[−zF, zP] (phủ hết mép răng cưa front),
    //   khoét lỗ chạm mép (vd cửa y=0 → hở ngạch). dưới (y=0) normal −Y, trên (y=h) normal +Y. ~2 quad.
    const capRowK = tint(p.wood, 0.55)
    const ck4 = [capRowK, capRowK, capRowK, capRowK]
    const capRow = (yL: number, up: boolean): void => {
      const probe = up ? yL - 1e-4 : yL + 1e-4
      for (const [xa, xb] of solidSpans(probe)) {
        if (up) quad([[xa, yL, -zF], [xa, yL, zP], [xb, yL, zP], [xb, yL, -zF]], ck4) // +Y (mặt trên)
        else quad([[xb, yL, -zF], [xb, yL, zP], [xa, yL, zP], [xa, yL, -zF]], ck4) // −Y (mặt dưới)
      }
    }
    capRow(0, false) // mặt dưới (chân tường)
    capRow(h, true) // mặt trên (đỉnh tường)

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
