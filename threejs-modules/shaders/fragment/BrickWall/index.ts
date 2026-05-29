/**
 * VỊ TRÍ   — threejs-modules/shaders/fragment/BrickWall/index.ts
 * VAI TRÒ  — Procedural brick wall material — no UV, world-space triplanar projection
 * LIÊN HỆ  — Phase 6 / 01-Doraemon building system; GLSL reference: shadertoy.glsl
 *
 * Algorithm (IQ-style opRep sdBox adapted to fragment shader):
 *   1. Project positionWorld onto 3 axis-aligned planes (XY / ZY / XZ)
 *   2. For each plane: running-bond brick grid → mortar smoothstep → per-brick variation
 *   3. Triplanar blend using normalWorld abs weights
 *
 * DISPOSE: material.dispose() — textures NOT owned here
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

export interface BrickWallOptions {
  /** Brick width in world units. Default: 0.40 m */
  brickW?: number
  /** Brick height in world units. Default: 0.20 m */
  brickH?: number
  /** Mortar joint thickness in world units. Default: 0.015 m */
  mortar?: number
  /** Per-brick lightness variation amplitude. Default: 0.08 */
  variation?: number
  /** Surface micro-roughness amplitude. Default: 0.025 */
  roughness?: number
  /** Triplanar blend sharpness. Higher = crisper transitions. Default: 8.0 */
  blendSharpness?: number
  /** Brick base color. Default: 0xb86042 (terra cotta) */
  brickColor?: THREE.ColorRepresentation
  /** Mortar color. Default: 0xc7c4be (light grey cement) */
  mortarColor?: THREE.ColorRepresentation
  /** Bump intensity của mạch vữa (dùng getNormalNode). Default: 0.5 */
  bumpScale?: number
}

// ── BrickWall class ───────────────────────────────────────────────────────────

export class BrickWall {
  private material: NodeMaterial | null = null
  private normalNode: TSLNode | null = null // lazy cache cho getNormalNode()
  private roughnessNode: TSLNode | null = null // lazy cache cho getRoughnessNode()
  private isDisposed = false

  private readonly uBrickW: ReturnType<typeof uniform>
  private readonly uBrickH: ReturnType<typeof uniform>
  private readonly uMortar: ReturnType<typeof uniform>
  private readonly uVariation: ReturnType<typeof uniform>
  private readonly uRoughness: ReturnType<typeof uniform>
  private readonly uBlend: ReturnType<typeof uniform>
  private readonly uBrickColor: ReturnType<typeof uniform>
  private readonly uMortarColor: ReturnType<typeof uniform>
  private readonly uBumpScale: ReturnType<typeof uniform>

  constructor(opts: BrickWallOptions = {}) {
    this.uBrickW    = uniform(opts.brickW         ?? 0.40)
    this.uBrickH    = uniform(opts.brickH         ?? 0.20)
    this.uMortar    = uniform(opts.mortar         ?? 0.015)
    this.uVariation = uniform(opts.variation      ?? 0.08)
    this.uRoughness = uniform(opts.roughness      ?? 0.025)
    this.uBlend     = uniform(opts.blendSharpness ?? 8.0)
    this.uBrickColor  = uniform(new THREE.Color(opts.brickColor  ?? 0xb86042))
    this.uMortarColor = uniform(new THREE.Color(opts.mortarColor ?? 0xc7c4be))
    this.uBumpScale   = uniform(opts.bumpScale ?? 0.5)

    const mat = new NodeMaterial()
    mat.colorNode = this._buildColorNode()
    this.material = mat
  }

  // ── Setters ────────────────────────────────────────────────────────────────

  /** Brick width in world units. */
  setBrickW(v: number): void {
    if (this.isDisposed) return
    this.uBrickW.value = Math.max(0.05, v)
  }

  /** Brick height in world units. */
  setBrickH(v: number): void {
    if (this.isDisposed) return
    this.uBrickH.value = Math.max(0.02, v)
  }

  /** Mortar joint thickness. Keep below 0.05 for realistic results. */
  setMortar(v: number): void {
    if (this.isDisposed) return
    this.uMortar.value = Math.max(0.001, Math.min(0.1, v))
  }

  /** Per-brick lightness variation [0 – 0.3]. */
  setVariation(v: number): void {
    if (this.isDisposed) return
    this.uVariation.value = Math.max(0, Math.min(0.3, v))
  }

  /** Surface micro-roughness amplitude [0 – 0.15]. */
  setRoughness(v: number): void {
    if (this.isDisposed) return
    this.uRoughness.value = Math.max(0, Math.min(0.15, v))
  }

  /** Triplanar blend sharpness [1 – 20]. Default 8 = crisp seams. */
  setBlendSharpness(v: number): void {
    if (this.isDisposed) return
    this.uBlend.value = Math.max(1, Math.min(20, v))
  }

  /** Brick base color. */
  setBrickColor(c: THREE.ColorRepresentation): void {
    if (this.isDisposed) return
    ;(this.uBrickColor.value as THREE.Color).set(c)
  }

  /** Mortar joint color. */
  setMortarColor(c: THREE.ColorRepresentation): void {
    if (this.isDisposed) return
    ;(this.uMortarColor.value as THREE.Color).set(c)
  }

  getMaterial(): NodeMaterial {
    if (!this.material) throw new Error('BrickWall: already disposed')
    return this.material
  }

  /**
   * Normal node (Mikkelsen screen-space bump) — mạch vữa lõm bắt sáng thật.
   * Gán: `meshStandardNodeMat.normalNode = brick.getNormalNode()`. Lazy + cache.
   */
  getNormalNode(): NodeMaterial['normalNode'] {
    if (!this.material) throw new Error('BrickWall: already disposed')
    if (this.normalNode === null) this.normalNode = this._buildNormalNode()
    return this.normalNode as NodeMaterial['normalNode']
  }

  /**
   * Roughness node — mạch vữa rất nhám (matte), mặt gạch đỡ nhám + grain noise.
   * Roughness biến thiên (thay vì phẳng) là đòn chính chống bề mặt "nhựa".
   */
  getRoughnessNode(): TSLNode {
    if (!this.material) throw new Error('BrickWall: already disposed')
    return this.roughnessNode ?? (this.roughnessNode = this._buildRoughnessNode())
  }

  /** Cường độ nổi của mạch vữa. Range [0, 2]. */
  setBumpScale(v: number): void {
    if (this.isDisposed) return
    this.uBumpScale.value = Math.max(0, Math.min(2, v))
  }

  dispose(): void {
    if (this.isDisposed) return
    this.material?.dispose()
    this.material = null
    this.normalNode = null
    this.roughnessNode = null
    this.isDisposed = true
  }

  // ── Private ────────────────────────────────────────────────────────────────

  // Brick mask blend triplanar: mạch vữa (0, lõm/nhám) → mặt gạch (1). Dùng chung normal + roughness.
  private _brickMask(): TSLNode {
    const { uBrickW, uBrickH, uMortar, uBlend } = this
    const bevel = (px: TSLNode, py: TSLNode): TSLNode => {
      const su = px.div(uBrickW.add(uMortar))
      const sv = py.div(uBrickH.add(uMortar))
      const stagger = step(float(0.5), sv.floor().mul(float(0.5)).fract()).mul(float(0.5))
      const localU = su.add(stagger).fract()
      const localV = sv.fract()
      const minDist = min(min(localU, localU.oneMinus()), min(localV, localV.oneMinus()))
      const bevelW = uMortar.div(uBrickW.add(uMortar)).mul(float(3)) // rãnh vát ~3× mortar
      return smoothstep(float(0), bevelW, minDist)
    }
    const hXY = bevel(positionWorld.x, positionWorld.y)
    const hZY = bevel(positionWorld.z, positionWorld.y)
    const hXZ = bevel(positionWorld.x, positionWorld.z)
    const sharp = normalWorld.abs().pow(vec3(uBlend))
    const w = sharp.div(sharp.dot(vec3(1.0)).max(float(0.001)))
    return hZY.mul(w.x).add(hXZ.mul(w.y)).add(hXY.mul(w.z)) as TSLNode
  }

  // Bump từ mask (mạch vữa lõm) qua screen-space derivative.
  private _buildNormalNode(): TSLNode {
    return this._perturbNormal(this._brickMask())
  }

  // Roughness biến thiên: vữa matte (0.97) → gạch (0.82) + grain → phá vẻ "nhựa" đồng đều.
  private _buildRoughnessNode(): TSLNode {
    const mask = this._brickMask()
    const grain = triNoise3D(positionWorld.mul(float(14.0)), float(0), float(0))
      .sub(float(0.5))
      .mul(float(0.14))
    return mix(float(0.97), float(0.82), mask).add(grain).clamp(float(0.45), float(1.0)) as TSLNode
  }

  // Port của three BumpMapNode.perturbNormalArb (không export): suy normal view-space từ
  // đạo hàm màn hình của height h. Projection-agnostic → hợp triplanar, không cần tangent.
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

  /**
   * Build TSL color node:
   *   brickFace(px, py) × 3 projections → triplanar blend
   */
  private _buildColorNode(): TSLNode {
    const {
      uBrickW, uBrickH, uMortar, uVariation,
      uRoughness, uBlend, uBrickColor, uMortarColor,
    } = this

    // Brick pattern for one axis-aligned projection
    const brickFace = (px: TSLNode, py: TSLNode): TSLNode => {
      const bwM = uBrickW.add(uMortar)   // brick+mortar cell width
      const bhM = uBrickH.add(uMortar)   // brick+mortar cell height

      const su = px.div(bwM)
      const sv = py.div(bhM)

      // Running bond: every other row shifted by half brick
      const row     = sv.floor()
      // step(0.5, fract(row * 0.5)) → 1 on odd rows, 0 on even → * 0.5 = stagger offset
      const stagger = step(float(0.5), row.mul(float(0.5)).fract()).mul(float(0.5))

      const suS   = su.add(stagger)       // staggered U
      const localU = suS.fract()          // [0,1] within brick cell (horizontal)
      const localV = sv.fract()           // [0,1] within brick cell (vertical)
      const cellU  = suS.floor()          // brick grid X index
      const cellV  = row                  // brick grid Y index

      // Distance to nearest mortar edge (both axes independently)
      const dU = min(localU, localU.oneMinus())
      const dV = min(localV, localV.oneMinus())
      const minDist = min(dU, dV)

      // Mortar occupies mFrac fraction of cell; smoothstep → crisp AA'd edge.
      // AA: mép rộng tối thiểu ~1px màn hình (fwidth) → hết răng cưa khi ở xa/nghiêng;
      // gần thì mFrac*2.5 giữ nét. minDist liên tục qua seam nên fwidth an toàn (không spike).
      const mFrac   = uMortar.div(bwM)
      const aaW     = mFrac.mul(float(2.5)).max(minDist.fwidth().mul(float(1.5)))
      const isBrick = smoothstep(float(0), aaW, minDist)

      // Per-brick lightness variation: noise keyed by cell grid integer coords
      const cellHash = triNoise3D(
        vec3(cellU.mul(float(7.3)), cellV.mul(float(13.7)), float(0)),
        float(0), float(0),
      ).sub(float(0.5)).mul(uVariation)

      // Micro roughness: noise at higher spatial frequency on world coords
      const roughNoise = triNoise3D(
        vec3(px.mul(float(18.0)), py.mul(float(18.0)), float(0.5)),
        float(0), float(0),
      ).sub(float(0.5)).mul(uRoughness)

      // Brick: base color + per-brick + roughness; mortar: flat
      const brickFinal  = uBrickColor.add(vec3(cellHash.add(roughNoise)))
      const mortarFinal = uMortarColor

      // AO: darken near joints
      const ao     = isBrick.mul(float(0.12)).add(float(0.88))
      const blended = mix(mortarFinal, brickFinal, isBrick).mul(ao)
      return blended
    }

    // Three axis-aligned projections (world space → no UV needed)
    const colXY = brickFace(positionWorld.x, positionWorld.y) // Z-facing walls
    const colZY = brickFace(positionWorld.z, positionWorld.y) // X-facing walls
    const colXZ = brickFace(positionWorld.x, positionWorld.z) // Y-facing (floor/roof)

    // Triplanar blend weights: |normal|^blend, normalized so weights sum to 1
    const absN    = normalWorld.abs()
    const blendV  = vec3(uBlend)
    const sharp   = absN.pow(blendV)
    const wSum    = sharp.dot(vec3(1.0)).max(float(0.001))
    const w       = sharp.div(wSum) // vec3: (wx, wy, wz)

    // Final: weighted sum of three face colors
    return colZY.mul(w.x).add(colXZ.mul(w.y)).add(colXY.mul(w.z))
  }
}
