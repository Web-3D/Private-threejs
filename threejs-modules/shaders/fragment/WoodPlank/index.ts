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
  float,
  min,
  mix,
  normalWorld,
  positionWorld,
  smoothstep,
  triNoise3D,
  uniform,
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
}

// ── WoodPlank ─────────────────────────────────────────────────────────────────

export class WoodPlank {
  private material: NodeMaterial | null = null
  private isDisposed = false

  private readonly uScale:     ReturnType<typeof uniform>
  private readonly uPlankH:    ReturnType<typeof uniform>
  private readonly uSeamFrac:  ReturnType<typeof uniform>
  private readonly uGrainAmp:  ReturnType<typeof uniform>
  private readonly uWoodColor: ReturnType<typeof uniform>
  private readonly uDarkColor: ReturnType<typeof uniform>
  private readonly uSeamColor: ReturnType<typeof uniform>

  constructor(opts: WoodPlankOptions = {}) {
    this.uScale     = uniform(opts.scale    ?? 1.0)
    this.uPlankH    = uniform(opts.plankH   ?? 0.14)
    this.uSeamFrac  = uniform(opts.seamFrac ?? 0.08)
    this.uGrainAmp  = uniform(opts.grainAmp ?? 0.22)
    this.uWoodColor = uniform(new THREE.Color(opts.woodColor ?? 0xb88548))
    this.uDarkColor = uniform(new THREE.Color(opts.darkColor ?? 0x61361e))
    this.uSeamColor = uniform(new THREE.Color(opts.seamColor ?? 0x2e1f13))

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

  // ── Dispose ───────────────────────────────────────────────────────────────

  dispose(): void {
    if (this.isDisposed) return
    this.material?.dispose()
    this.material = null
    this.isDisposed = true
  }

  // ── TSL node graph ────────────────────────────────────────────────────────

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
