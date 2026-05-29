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
  min,
  mix,
  normalView,
  normalWorld,
  positionView,
  positionWorld,
  smoothstep,
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
  /** Seam gap as fraction of plankH. Default: 0.08 (8%) */
  seamFrac?: number
  /** Grain noise amplitude (0–1). Default: 0.22 */
  grainAmp?: number
  /** Base wood colour (light). Default: warm pine */
  woodColor?: THREE.ColorRepresentation
  /** Dark vein / end-grain colour. Default: dark walnut */
  darkColor?: THREE.ColorRepresentation
  /** Seam crack colour. Default: near-black */
  seamColor?: THREE.ColorRepresentation
  /** Bump intensity của seam ván (dùng getNormalNode). Default: 0.5 */
  bumpScale?: number
}

// ── WoodPlank ─────────────────────────────────────────────────────────────────

export class WoodPlank {
  private material: NodeMaterial | null = null
  private normalNode: TSLNode | null = null
  private roughnessNode: TSLNode | null = null
  private isDisposed = false

  private readonly uScale:     ReturnType<typeof uniform>
  private readonly uPlankH:    ReturnType<typeof uniform>
  private readonly uSeamFrac:  ReturnType<typeof uniform>
  private readonly uGrainAmp:  ReturnType<typeof uniform>
  private readonly uWoodColor: ReturnType<typeof uniform>
  private readonly uDarkColor: ReturnType<typeof uniform>
  private readonly uSeamColor: ReturnType<typeof uniform>
  private readonly uBumpScale: ReturnType<typeof uniform>

  constructor(opts: WoodPlankOptions = {}) {
    this.uScale     = uniform(opts.scale    ?? 1.0)
    this.uPlankH    = uniform(opts.plankH   ?? 0.14)
    this.uSeamFrac  = uniform(opts.seamFrac ?? 0.08)
    this.uGrainAmp  = uniform(opts.grainAmp ?? 0.22)
    this.uWoodColor = uniform(new THREE.Color(opts.woodColor ?? 0xb88548))
    this.uDarkColor = uniform(new THREE.Color(opts.darkColor ?? 0x61361e))
    this.uSeamColor = uniform(new THREE.Color(opts.seamColor ?? 0x2e1f13))
    this.uBumpScale = uniform(opts.bumpScale ?? 0.5)

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

    return colZY.mul(w.x).add(colXZ.mul(w.y)).add(colXY.mul(w.z)) as TSLNode
  }

  /**
   * Plank pattern for one axis-aligned projection.
   * pu = horizontal axis, pv = height axis (plank rows run horizontally).
   */
  private _plankFace(pu: TSLNode, pv: TSLNode): TSLNode {
    const { uPlankH, uSeamFrac, uGrainAmp, uWoodColor, uDarkColor, uSeamColor } = this

    // ── Row ──────────────────────────────────────────────────────────────────
    // totalH = plankH * (1 + seamFrac) — height of 1 plank + 1 seam
    const totalH  = uPlankH.mul(float(1).add(uSeamFrac))
    const rowF    = pv.div(totalH)
    const rowIdx  = rowF.floor()
    const rowLoc  = rowF.fract()   // 0..1 trong 1 row

    // Seam occupies top portion of each row cycle. AA: mép mềm ~1px (fwidth của rowF liên tục)
    // thay step cứng → hết răng cưa đường ngang ở xa/nghiêng.
    const seamThr = float(1).sub(uSeamFrac)
    const seamAA  = rowF.fwidth().mul(float(0.75))
    const isSeam  = smoothstep(seamThr.sub(seamAA), seamThr.add(seamAA), rowLoc)

    // ── X stagger per row ─────────────────────────────────────────────────────
    // Hash rowIdx → 1D value → use as X offset so boards don't line up
    const rowHash = triNoise3D(vec3(rowIdx.mul(float(7.31)), float(0), float(0)), float(0), float(0))
    const xShift  = rowHash.mul(float(0.4))
    const puS     = pu.add(xShift).fract()   // shifted, wrapped

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

    // ── End-grain darkening ───────────────────────────────────────────────────
    // Tối dần ở 2 cạnh mỗi ván (puS ≈ 0 và ≈ 1)
    const leftDark  = smoothstep(float(0.08), float(0), puS)
    const rightDark = smoothstep(float(0.92), float(1), puS)
    const edgeDark  = min(leftDark.add(rightDark).mul(float(0.55)), float(1))

    // ── Per-row hue shift ──────────────────────────────────────────────────────
    // Small ±0.06 so neighbouring planks look slightly different
    const rowHue = rowHash.sub(float(0.5)).mul(float(0.06))

    // ── Assemble wood colour ──────────────────────────────────────────────────
    const grainFactor = grain.mul(uGrainAmp).add(edgeDark)
    const woodMixed   = mix(uWoodColor, uDarkColor, grainFactor)

    // Hue shift: warm → red channel up, blue down
    const hueShift = vec3(
      rowHue.mul(float(0.5)),
      rowHue.mul(float(0.3)),
      float(0).sub(rowHue).mul(float(0.1)),
    )
    const woodWithHue = woodMixed.add(hueShift)

    // Seam override
    return mix(woodWithHue, uSeamColor, isSeam) as TSLNode
  }
}
