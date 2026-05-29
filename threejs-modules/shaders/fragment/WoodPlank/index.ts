/**
 * VỊ TRÍ   — threejs-modules/shaders/fragment/WoodPlank/index.ts
 * VAI TRÒ  — TSL NodeMaterial: horizontal plank grain, seam gap, end-grain darkening
 * LIÊN HỆ  — dùng triplanar world-space; shadertoy.glsl là reference GLSL
 *
 * CÁCH DÙNG:
 *   const wood = new WoodPlank({ scale: 2.0, plankH: 0.14 })
 *   mesh.material = wood.getMaterial()
 *   // cleanup:
 *   wood.dispose()
 *
 * DISPOSE: dispose() giải phóng NodeMaterial (texture không owned)
 */

import * as THREE from 'three'
import { NodeMaterial } from 'three/webgpu'
import {
  faceDirection,
  float,
  int,
  min,
  mix,
  mx_fractal_noise_float,
  normalView,
  normalWorld,
  positionView,
  positionWorld,
  smoothstep,
  step,
  triNoise3D,
  uniform,
  vec2,
  vec3,
} from 'three/tsl'
import type { ShaderNodeObject } from 'three/tsl'
import type Node from 'three/src/nodes/core/Node.js'

// ── Types ─────────────────────────────────────────────────────────────────────

type TSLNode = ShaderNodeObject<Node>

// ── Options ───────────────────────────────────────────────────────────────────

export interface WoodPlankOptions {
  /** World-space texture scale. Default: 1.0 */
  scale?: number
  /** Plank height in metres (world space / scale). Default: 0.14 */
  plankH?: number
  /** Plank length in scaled units (butt-joint spacing). Lớn = ván dài, ít mối nối dọc. Default: 4.0 */
  plankLen?: number
  /** Seam gap as fraction of plankH. Default: 0.08 (8%) */
  seamFrac?: number
  /** Grain noise amplitude (0–1). Default: 0.22 */
  grainAmp?: number
  /** Base wood colour (light). Default: warm pine */
  woodColor?: THREE.ColorRepresentation
  /** Dark vein / end-grain colour. Default: dark walnut */
  darkColor?: THREE.ColorRepresentation
  /** Bump intensity của seam ván (dùng getNormalNode). Default: 0.5 */
  bumpScale?: number
  /** Loang lổ (bạc màu/nắng mưa) — độ mạnh đổi tông mảng [0–1]. Default: 0.45 */
  mottle?: number
  /** Tần số loang lổ (1/m). Nhỏ = mảng to. Default: 0.4 */
  mottleScale?: number
  /** Độ sâu BÓNG khe ván (đậm ở đỉnh khe → mờ xuống) [0–1]. Cao = khe tối/sâu. Default: 0.85 */
  grooveShadow?: number
  /** Bề rộng bóng khe DỌC (butt-joint) [0–0.3]. Nhỏ = vệt mờ ngắn/sắc hơn. Default: 0.0125 */
  jointW?: number
  /** Nẻ thớ gỗ — độ sẫm đường nẻ [0–1]. Default: 0.4 */
  crack?: number
  /** Tần số nẻ (1/m). Default: 3.5 */
  crackScale?: number
  /** Bề rộng đường nẻ [0–0.1]. Default: 0.04 */
  crackWidth?: number
}

// ── WoodPlank ─────────────────────────────────────────────────────────────────

export class WoodPlank {
  private material: NodeMaterial | null = null
  private normalNode: TSLNode | null = null
  private roughnessNode: TSLNode | null = null
  private isDisposed = false

  private readonly uScale:     ReturnType<typeof uniform>
  private readonly uPlankH:    ReturnType<typeof uniform>
  private readonly uPlankLen:  ReturnType<typeof uniform>
  private readonly uSeamFrac:  ReturnType<typeof uniform>
  private readonly uGrainAmp:  ReturnType<typeof uniform>
  private readonly uWoodColor: ReturnType<typeof uniform>
  private readonly uDarkColor: ReturnType<typeof uniform>
  private readonly uBumpScale: ReturnType<typeof uniform>
  private readonly uMottle:     ReturnType<typeof uniform>
  private readonly uMottleScale: ReturnType<typeof uniform>
  private readonly uGrooveShadow: ReturnType<typeof uniform>
  private readonly uJointW:     ReturnType<typeof uniform>
  private readonly uCrack:      ReturnType<typeof uniform>
  private readonly uCrackScale: ReturnType<typeof uniform>
  private readonly uCrackWidth: ReturnType<typeof uniform>

  constructor(opts: WoodPlankOptions = {}) {
    this.uScale     = uniform(opts.scale    ?? 1.0)
    this.uPlankH    = uniform(opts.plankH   ?? 0.14)
    this.uPlankLen  = uniform(opts.plankLen ?? 4.0)
    this.uSeamFrac  = uniform(opts.seamFrac ?? 0.08)
    this.uGrainAmp  = uniform(opts.grainAmp ?? 0.22)
    this.uWoodColor = uniform(new THREE.Color(opts.woodColor ?? 0xb88548))
    this.uDarkColor = uniform(new THREE.Color(opts.darkColor ?? 0x61361e))
    this.uBumpScale = uniform(opts.bumpScale ?? 0.5)
    this.uMottle      = uniform(opts.mottle      ?? 0.45)
    this.uMottleScale = uniform(opts.mottleScale ?? 0.4)
    this.uGrooveShadow = uniform(opts.grooveShadow ?? 0.85)
    this.uJointW    = uniform(opts.jointW   ?? 0.0125)
    this.uCrack       = uniform(opts.crack       ?? 0.4)
    this.uCrackScale  = uniform(opts.crackScale  ?? 3.5)
    this.uCrackWidth  = uniform(opts.crackWidth  ?? 0.04)

    const mat = new NodeMaterial()
    mat.colorNode = this._buildColorNode()
    this.material = mat
  }

  // ── Setters ───────────────────────────────────────────────────────────────

  /** World-space scale (larger = smaller planks). Min: 0.001 */
  setScale(v: number): void {
    if (this.isDisposed) return
    this.uScale.value = Math.max(0.001, v)
  }

  /** Plank height in scaled world units. Range: 0.05–0.5 */
  setPlankH(v: number): void {
    if (this.isDisposed) return
    this.uPlankH.value = Math.max(0.05, Math.min(0.5, v))
  }

  /** Grain noise amplitude. Range: 0–1 */
  setGrainAmp(v: number): void {
    if (this.isDisposed) return
    this.uGrainAmp.value = Math.max(0, Math.min(1, v))
  }

  /** Seam fraction (seam/plankH). Range: 0.02–0.15 */
  setSeamFrac(v: number): void {
    if (this.isDisposed) return
    this.uSeamFrac.value = Math.max(0.02, Math.min(0.15, v))
  }

  setWoodColor(c: THREE.ColorRepresentation): void {
    if (this.isDisposed) return
    ;(this.uWoodColor.value as THREE.Color).set(c)
  }

  setDarkColor(c: THREE.ColorRepresentation): void {
    if (this.isDisposed) return
    ;(this.uDarkColor.value as THREE.Color).set(c)
  }

  // ── Public access ─────────────────────────────────────────────────────────

  getMaterial(): NodeMaterial {
    if (!this.material) throw new Error('WoodPlank: đã dispose')
    return this.material
  }

  /** Normal node — bump từ seam ván (Mikkelsen screen-space). */
  getNormalNode(): NodeMaterial['normalNode'] {
    if (!this.material) throw new Error('WoodPlank: đã dispose')
    if (this.normalNode === null) this.normalNode = this._perturbNormal(this._plankMask())
    return this.normalNode as NodeMaterial['normalNode']
  }

  /** Roughness node — seam nhám, mặt ván mịn hơn + grain. */
  getRoughnessNode(): TSLNode {
    if (!this.material) throw new Error('WoodPlank: đã dispose')
    return this.roughnessNode ?? (this.roughnessNode = this._buildRoughnessNode())
  }

  // ── Dispose ───────────────────────────────────────────────────────────────

  dispose(): void {
    if (this.isDisposed) return
    this.material?.dispose()
    this.material = null
    this.normalNode = null
    this.roughnessNode = null
    this.isDisposed = true
  }

  // ── TSL node graph ────────────────────────────────────────────────────────

  // Plank mask blend triplanar: seam ngang (0, lõm) → mặt ván (1). Dùng cho normal + roughness.
  private _plankMask(): TSLNode {
    const { uScale, uPlankH, uSeamFrac } = this
    const bevel = (pv: TSLNode): TSLNode => {
      const rowLoc = pv.div(uPlankH.mul(float(1).add(uSeamFrac))).fract()
      const seamThr = float(1).sub(uSeamFrac)
      const d = min(rowLoc, seamThr.sub(rowLoc)) // >0 trong ván, <0 trong seam
      return smoothstep(float(0), uSeamFrac.mul(float(0.8)), d)
    }
    const hY = bevel(positionWorld.y.mul(uScale)) // wall: seam ngang theo Y
    const hZ = bevel(positionWorld.z.mul(uScale)) // floor/roof: theo Z
    const sharp = normalWorld.abs().pow(vec3(8.0))
    const w = sharp.div(sharp.dot(vec3(1.0)).max(float(0.001)))
    return hY.mul(w.x).add(hZ.mul(w.y)).add(hY.mul(w.z)) as TSLNode
  }

  private _buildRoughnessNode(): TSLNode {
    const grain = triNoise3D(positionWorld.mul(this.uScale).mul(float(8.0)), float(0), float(0))
      .sub(float(0.5))
      .mul(float(0.14))
    return mix(float(0.9), float(0.7), this._plankMask())
      .add(grain)
      .clamp(float(0.5), float(1.0)) as TSLNode
  }

  // Port three BumpMapNode.perturbNormalArb (không export): normal view-space từ screen-space dH.
  private _perturbNormal(h: TSLNode): TSLNode {
    const dHdxy = vec2(h.dFdx(), h.dFdy()).mul(this.uBumpScale)
    const sigmaX = positionView.dFdx().normalize()
    const sigmaY = positionView.dFdy().normalize()
    const r1 = sigmaY.cross(normalView)
    const r2 = normalView.cross(sigmaX)
    const fDet = sigmaX.dot(r1).mul(faceDirection)
    const vGrad = fDet.sign().mul(dHdxy.x.mul(r1).add(dHdxy.y.mul(r2)))
    return fDet.abs().mul(normalView).sub(vGrad).normalize() as TSLNode
  }

  private _buildColorNode(): TSLNode {
    const { uScale } = this

    // Three axis-aligned projections (same convention as BrickWall)
    const colXY = this._plankFace(positionWorld.x.mul(uScale), positionWorld.y.mul(uScale)) // Z-wall
    const colZY = this._plankFace(positionWorld.z.mul(uScale), positionWorld.y.mul(uScale)) // X-wall
    const colXZ = this._plankFace(positionWorld.x.mul(uScale), positionWorld.z.mul(uScale)) // floor/roof

    // Triplanar blend weights: |normal|^8, normalized
    const absN   = normalWorld.abs()
    const sharp  = absN.pow(vec3(8.0))
    const wSum   = sharp.dot(vec3(1.0)).max(float(0.001))
    const w      = sharp.div(wSum) // vec3(wx, wy, wz)

    const blended = colZY.mul(w.x).add(colXZ.mul(w.y)).add(colXY.mul(w.z))

    // Loang lổ (bạc màu nắng mưa) 2 lớp fbm: đổi tông nâu sâu ↔ sáng ấm → mảng loang qua nhiều ván.
    const nBig = mx_fractal_noise_float(positionWorld.mul(this.uMottleScale), int(4), float(2.0), float(0.5))
    const nSmall = mx_fractal_noise_float(
      positionWorld.mul(this.uMottleScale.mul(float(3.7))), int(3), float(2.0), float(0.55))
    const t = nBig.add(nSmall.mul(float(0.5))).mul(float(0.5)).add(float(0.5)).clamp(float(0), float(1))
    const dark = blended.mul(vec3(0.72, 0.6, 0.46)) // nâu sâu
    const lite = blended.mul(vec3(1.18, 1.1, 0.95)) // sáng ấm
    const mottled = mix(dark, lite, t)
    const weathered = mix(blended, mottled, this.uMottle.clamp(float(0), float(1)))

    // Nẻ thớ gỗ: level-set fbm KÉO NGANG THEO THỚ (scale Y cao → đường nẻ chạy ngang);
    // mask theo mặt ván (tắt ở khe); màu = gỗ đậm hơn (×0.45).
    const cp = positionWorld.mul(vec3(this.uCrackScale, this.uCrackScale.mul(float(2.5)), this.uCrackScale))
    const cn = mx_fractal_noise_float(cp, int(4), float(2.3), float(0.5))
    const line = float(1).sub(smoothstep(float(0), this.uCrackWidth, cn.abs()))
    const cluster = smoothstep(float(0.5), float(0.85),
      mx_fractal_noise_float(positionWorld.mul(this.uCrackScale.mul(float(0.25))), int(2), float(2.0), float(0.5))
        .mul(float(0.5)).add(float(0.5)))
    const crack = line.mul(cluster).mul(this._plankMask()).mul(this.uCrack.clamp(float(0), float(1)))
    return mix(weathered, weathered.mul(float(0.45)), crack) as TSLNode
  }

  /**
   * Plank pattern for one axis-aligned projection.
   * pu = horizontal axis, pv = height axis (plank rows run horizontally).
   */
  private _plankFace(pu: TSLNode, pv: TSLNode): TSLNode {
    const { uPlankH, uPlankLen, uSeamFrac, uGrainAmp, uWoodColor, uDarkColor, uGrooveShadow, uJointW } = this

    // ── Row ──────────────────────────────────────────────────────────────────
    // totalH = plankH * (1 + seamFrac) — height of 1 plank + 1 seam
    const totalH  = uPlankH.mul(float(1).add(uSeamFrac))
    const rowF    = pv.div(totalH)
    const rowIdx  = rowF.floor()
    const rowLoc  = rowF.fract()   // 0..1 trong 1 row

    // Khe nằm ở phần trên mỗi row cycle (rowLoc ∈ [seamThr, 1]).
    const seamThr = float(1).sub(uSeamFrac)

    // ── X stagger per row + plank length ──────────────────────────────────────
    // Hash rowIdx → X offset (so le mối nối); chia pu theo plankLen → ván DÀI, mối nối thưa
    const rowHash = triNoise3D(vec3(rowIdx.mul(float(7.31)), float(0), float(0)), float(0), float(0))
    const xShift  = rowHash.mul(float(0.5))
    const cellF   = pu.div(uPlankLen).add(xShift)
    const puS     = cellF.fract()   // 0..1 trong 1 ván dài uPlankLen
    const cellU   = cellF.floor()   // chỉ số ván — để hash kiểu mối nối

    // ── Wood grain ────────────────────────────────────────────────────────────
    // Grain runs along horizontal axis (pu direction, simulating wood fibre)
    // octave 0: coarse grain
    const g0 = triNoise3D(
      vec3(pu.mul(float(8.0)), pv.mul(float(0.5)).add(rowIdx.mul(float(0.3))), float(0)),
      float(0), float(0),
    )
    // octave 1: finer grain
    const g1 = triNoise3D(
      vec3(pu.mul(float(17.5)), pv.mul(float(1.2)).add(rowIdx.mul(float(0.7))), float(1)),
      float(0), float(0),
    )
    const grain = g0.mul(float(0.65)).add(g1.mul(float(0.35)))

    // ── Khe dọc (butt-joint) — RANDOM 3 kiểu/mối qua hash(chỉ số ván, hàng) ──
    // hash <0.4: bóng fade về TRÁI (sắc ở phải) | 0.4–0.6: chỉ ĐƯỜNG MẢNH | >0.6: fade về PHẢI (sắc ở trái).
    const distR = float(1).sub(puS)   // 0 tại mối phải (puS=1)
    const distL = puS                 // 0 tại mối trái (puS=0)
    const hashJ = (j: TSLNode): TSLNode =>
      triNoise3D(vec3(j.mul(float(13.1)), rowIdx.mul(float(5.7)), float(0)), float(0), float(0))
    const rR = hashJ(cellU.add(float(1)))   // mối bên phải ô
    const rL = hashJ(cellU)                 // mối bên trái ô
    const lineW = uJointW.mul(float(0.25))  // đường mảnh — luôn có ở cả 2 mối
    const lineR = float(1).sub(smoothstep(float(0), lineW, distR))
    const lineL = float(1).sub(smoothstep(float(0), lineW, distL))
    // fade rộng có điều kiện: mối phải cast TRÁI nếu rR<0.4; mối trái cast PHẢI nếu rL>0.6
    const fadeR = float(1).sub(smoothstep(float(0), uJointW, distR)).mul(float(1).sub(step(float(0.4), rR)))
    const fadeL = float(1).sub(smoothstep(float(0), uJointW, distL)).mul(step(float(0.6), rL))
    const jointShade = lineR.max(lineL).max(fadeR).max(fadeL)

    // ── Per-row hue shift ──────────────────────────────────────────────────────
    // Small ±0.06 so neighbouring planks look slightly different
    const rowHue = rowHash.sub(float(0.5)).mul(float(0.06))

    // ── Assemble wood colour ──────────────────────────────────────────────────
    const grainFactor = grain.mul(uGrainAmp)
    const woodMixed   = mix(uWoodColor, uDarkColor, grainFactor)

    // Hue shift: warm → red channel up, blue down
    const hueShift = vec3(
      rowHue.mul(float(0.5)),
      rowHue.mul(float(0.3)),
      float(0).sub(rowHue).mul(float(0.1)),
    )
    const woodWithHue = woodMixed.add(hueShift)

    // Khe ván = BÓNG gỗ tối (KHÔNG tô đen phẳng). NGANG: đậm dưới ván trên (rowLoc→1, mép trên SẮC do
    // fract reset) → mờ xuống. DỌC (jointShade): đậm mép phải → mờ trái. Lấy bóng SÂU NHẤT (max).
    const seamShade = smoothstep(seamThr, float(1), rowLoc)
    const shade     = seamShade.max(jointShade)
    return woodWithHue.mul(float(1).sub(shade.mul(uGrooveShadow))) as TSLNode
  }
}
