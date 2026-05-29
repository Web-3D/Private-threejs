/**
 * VỊ TRÍ   — threejs-modules/shaders/fragment/MetalPanel/index.ts
 * VAI TRÒ  — TSL NodeMaterial: corrugated metal ridges, panel seam, galvanized variation
 * LIÊN HỆ  — dùng triplanar world-space; shadertoy.glsl là reference GLSL
 *
 * CÁCH DÙNG:
 *   const metal = new MetalPanel({ ridgeH: 0.06, ridgesPerPanel: 8 })
 *   mesh.material = metal.getMaterial()
 *   metal.dispose()
 *
 * DISPOSE: dispose() giải phóng NodeMaterial
 */

import * as THREE from 'three'
import { NodeMaterial } from 'three/webgpu'
import {
  faceDirection,
  float,
  mix,
  min,
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

export interface MetalPanelOptions {
  /** World-space scale. Default: 1.0 */
  scale?: number
  /** Ridge height in metres (world/scale). Default: 0.06 */
  ridgeH?: number
  /** Number of ridges per panel width. Default: 8 */
  ridgesPerPanel?: number
  /** Seam width as fraction of ridgeH. Default: 0.12 */
  seamFrac?: number
  /** Ridge profile — fraction of period that forms the crown (0.5–0.9). Default: 0.7 */
  ridgeProfile?: number
  /** Galvanized brightness variation amplitude. Default: 0.06 */
  variation?: number
  /** Metal base color. Default: galvanized steel */
  metalColor?: THREE.ColorRepresentation
  /** Shadow/groove color. Default: dark grey */
  darkColor?: THREE.ColorRepresentation
  /** Panel seam color. Default: very dark */
  seamColor?: THREE.ColorRepresentation
  /** Bump intensity của gân tôn (dùng getNormalNode). Default: 0.5 */
  bumpScale?: number
}

// ── MetalPanel ────────────────────────────────────────────────────────────────

export class MetalPanel {
  private material: NodeMaterial | null = null
  private normalNode: TSLNode | null = null
  private roughnessNode: TSLNode | null = null
  private isDisposed = false

  private readonly uScale:          ReturnType<typeof uniform>
  private readonly uRidgeH:         ReturnType<typeof uniform>
  private readonly uRidgesPerPanel: ReturnType<typeof uniform>
  private readonly uSeamFrac:       ReturnType<typeof uniform>
  private readonly uRidgeProfile:   ReturnType<typeof uniform>
  private readonly uVariation:      ReturnType<typeof uniform>
  private readonly uMetalColor:     ReturnType<typeof uniform>
  private readonly uDarkColor:      ReturnType<typeof uniform>
  private readonly uSeamColor:      ReturnType<typeof uniform>
  private readonly uBumpScale:      ReturnType<typeof uniform>

  constructor(opts: MetalPanelOptions = {}) {
    this.uScale          = uniform(opts.scale          ?? 1.0)
    this.uRidgeH         = uniform(opts.ridgeH         ?? 0.06)
    this.uRidgesPerPanel = uniform(opts.ridgesPerPanel ?? 8.0)
    this.uSeamFrac       = uniform(opts.seamFrac       ?? 0.12)
    this.uRidgeProfile   = uniform(opts.ridgeProfile   ?? 0.70)
    this.uVariation      = uniform(opts.variation      ?? 0.06)
    this.uMetalColor     = uniform(new THREE.Color(opts.metalColor ?? 0xb9bdbc))
    this.uDarkColor      = uniform(new THREE.Color(opts.darkColor  ?? 0x616161))
    this.uSeamColor      = uniform(new THREE.Color(opts.seamColor  ?? 0x383838))
    this.uBumpScale      = uniform(opts.bumpScale ?? 0.5)

    const mat = new NodeMaterial()
    mat.colorNode = this._buildColorNode()
    this.material = mat
  }

  // ── Setters ───────────────────────────────────────────────────────────────

  /** World-space scale. Min: 0.001 */
  setScale(v: number): void {
    if (this.isDisposed) return
    this.uScale.value = Math.max(0.001, v)
  }

  /** Ridge height in scaled units. Range: 0.03–0.15 */
  setRidgeH(v: number): void {
    if (this.isDisposed) return
    this.uRidgeH.value = Math.max(0.03, Math.min(0.15, v))
  }

  /** Ridges per panel. Range: 4–20 */
  setRidgesPerPanel(v: number): void {
    if (this.isDisposed) return
    this.uRidgesPerPanel.value = Math.max(4, Math.min(20, v))
  }

  /** Galvanized variation amplitude. Range: 0–0.15 */
  setVariation(v: number): void {
    if (this.isDisposed) return
    this.uVariation.value = Math.max(0, Math.min(0.15, v))
  }

  setMetalColor(c: THREE.ColorRepresentation): void {
    if (this.isDisposed) return
    ;(this.uMetalColor.value as THREE.Color).set(c)
  }

  getMaterial(): NodeMaterial {
    if (!this.material) throw new Error('MetalPanel: đã dispose')
    return this.material
  }

  /** Normal node — bump từ gân tôn (corrugation profile, Mikkelsen screen-space). */
  getNormalNode(): NodeMaterial['normalNode'] {
    if (!this.material) throw new Error('MetalPanel: đã dispose')
    if (this.normalNode === null) this.normalNode = this._perturbNormal(this._ridgeHeight())
    return this.normalNode as NodeMaterial['normalNode']
  }

  /** Roughness node — đỉnh gân bóng hơn, rãnh nhám hơn + grain (kim loại). */
  getRoughnessNode(): TSLNode {
    if (!this.material) throw new Error('MetalPanel: đã dispose')
    return this.roughnessNode ?? (this.roughnessNode = this._buildRoughnessNode())
  }

  dispose(): void {
    if (this.isDisposed) return
    this.material?.dispose()
    this.material = null
    this.normalNode = null
    this.roughnessNode = null
    this.isDisposed = true
  }

  // ── TSL node graph ────────────────────────────────────────────────────────

  // Ridge height blend triplanar: gân tôn (profile crown) — relief chính của tôn. Cho normal+roughness.
  private _ridgeHeight(): TSLNode {
    const { uScale, uRidgeH, uRidgeProfile } = this
    const ridge = (pv: TSLNode): TSLNode => {
      const ridgeLoc = pv.div(uRidgeH).fract()
      const t = min(ridgeLoc.div(uRidgeProfile), float(1))
      const crown = smoothstep(float(0), float(0.5), t)
        .mul(smoothstep(float(1), float(0.5), t))
        .mul(float(2))
      const inCrown = smoothstep(float(0), float(0.05), uRidgeProfile.sub(ridgeLoc))
      return crown.mul(inCrown)
    }
    const ridgeY = ridge(positionWorld.y.mul(uScale)) // wall: ridges repeat theo Y
    const ridgeZ = ridge(positionWorld.z.mul(uScale)) // floor/roof: theo Z
    const sharp = normalWorld.abs().pow(vec3(8.0))
    const w = sharp.div(sharp.dot(vec3(1.0)).max(float(0.001)))
    return ridgeY.mul(w.x).add(ridgeZ.mul(w.y)).add(ridgeY.mul(w.z)) as TSLNode
  }

  private _buildRoughnessNode(): TSLNode {
    const grain = triNoise3D(positionWorld.mul(this.uScale).mul(float(6.0)), float(0), float(0))
      .sub(float(0.5))
      .mul(float(0.1))
    return mix(float(0.55), float(0.32), this._ridgeHeight())
      .add(grain)
      .clamp(float(0.25), float(0.8)) as TSLNode
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

    // Three axis-aligned projections
    // XY face (Z-facing wall): ridges run horizontally (X=horiz, Y=height)
    const colXY = this._metalFace(positionWorld.x.mul(uScale), positionWorld.y.mul(uScale))
    // ZY face (X-facing wall): ridges run horizontally (Z=horiz, Y=height)
    const colZY = this._metalFace(positionWorld.z.mul(uScale), positionWorld.y.mul(uScale))
    // XZ face (floor/roof): ridges run along X (X=horiz, Z=depth)
    const colXZ = this._metalFace(positionWorld.x.mul(uScale), positionWorld.z.mul(uScale))

    // Triplanar blend weights
    const absN  = normalWorld.abs()
    const sharp = absN.pow(vec3(8.0))
    const wSum  = sharp.dot(vec3(1.0)).max(float(0.001))
    const w     = sharp.div(wSum)

    return colZY.mul(w.x).add(colXZ.mul(w.y)).add(colXY.mul(w.z)) as TSLNode
  }

  /**
   * Metal panel pattern for one projection.
   * pu = horizontal axis, pv = vertical axis (ridges run along pu).
   */
  private _metalFace(pu: TSLNode, pv: TSLNode): TSLNode {
    const {
      uRidgeH, uRidgesPerPanel, uSeamFrac, uRidgeProfile,
      uVariation, uMetalColor, uDarkColor, uSeamColor,
    } = this

    // ── Ridges (repeat along pv) ─────────────────────────────────────────────
    const ridgeF   = pv.div(uRidgeH)
    const ridgeIdx = ridgeF.floor()
    const ridgeLoc = ridgeF.fract()   // 0..1 in 1 ridge cycle

    // Profile: ridgeLoc < ridgeProfile → crown, else valley
    // Crown: sin arch gives smooth rounded peak
    // Approximate sin(t*PI) with smoothstep chain: 0→1→0
    const t       = ridgeLoc.div(uRidgeProfile)
    // t.min(1) clamps to crown zone; use smoothstep rise + fall
    const tClamped = min(t, float(1))
    const crown   = smoothstep(float(0), float(0.5), tClamped)
                      .mul(smoothstep(float(1), float(0.5), tClamped))
                      .mul(float(2))  // peak = 1.0

    // Crown mask: 0 in valley, smoothly 1 in crown zone
    const inCrown = smoothstep(float(0), float(0.05), uRidgeProfile.sub(ridgeLoc))
    const profile = crown.mul(inCrown)

    // Crease at valley: dark groove at bottom of each ridge
    const creaseW = float(0.04)
    const crease  = smoothstep(float(0), creaseW, ridgeLoc)
                      .mul(smoothstep(uRidgeProfile.add(creaseW), uRidgeProfile, ridgeLoc))

    // ── Panel vertical seam (repeat along pu) ────────────────────────────────
    const panelW   = uRidgeH.mul(uRidgesPerPanel)  // panel width in scaled metres
    const panelF   = pu.div(panelW)
    const panelIdx = panelF.floor()
    const panelLoc = panelF.fract()
    // AA: mép seam dọc mềm ~1px (fwidth của panelF liên tục) thay step cứng → hết răng cưa.
    const seamThr  = float(1).sub(uSeamFrac.mul(float(0.1)))
    const seamAA   = panelF.fwidth().mul(float(0.75))
    const isSeam   = smoothstep(seamThr.sub(seamAA), seamThr.add(seamAA), panelLoc)

    // ── Per-panel galvanized variation ────────────────────────────────────────
    // Hash (panelIdx, ridgeIdx) → slight brightness ±variation
    const panelHash = triNoise3D(
      vec3(panelIdx.mul(float(11.3)), ridgeIdx.mul(float(7.7)), float(0)),
      float(0), float(0),
    ).sub(float(0.5)).mul(uVariation)

    // ── Specular highlight on ridge crown ─────────────────────────────────────
    const highlight = profile.mul(profile).mul(float(0.25))  // pow2 → sharp peak

    // ── Assemble ──────────────────────────────────────────────────────────────
    const baseCol  = uMetalColor.add(vec3(panelHash))

    // Ridge shading: crown = bright, valley = dark
    const ridgeCol = mix(uDarkColor, baseCol, float(0.5).add(profile.mul(float(0.5))))

    // Add highlight + crease darkening
    const litCol = ridgeCol.add(vec3(highlight)).mul(float(0.7).add(crease.mul(float(0.3))))

    // Seam override
    return mix(litCol, uSeamColor, isSeam) as TSLNode
  }
}
