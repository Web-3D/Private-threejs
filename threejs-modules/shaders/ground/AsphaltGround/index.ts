/**
 * VỊ TRÍ   — threejs-modules/shaders/ground/AsphaltGround/index.ts
 * VAI TRÒ  — Procedural asphalt/tar road ground (đường nhựa hắc ín) — world-space XZ, no UV
 * LIÊN HỆ  — Nhóm ground/ (môi trường tự nhiên); cùng interface wall shaders.
 *
 * Thuật toán (ground nằm ngang → sample positionWorld.xz):
 *   1. Nền tar đen + mảng mòn (fbm tần số thấp: vệt bánh xe đánh bóng sáng ↔ tar mới tối)
 *   2. Cốt liệu đá xám rải (noise thresh) + grain tiêu li ti → bề mặt nhám hạt
 *   3. Normal từ hạt cốt liệu (screen-space bump + LOD chống lấp lánh)
 *   4. Roughness cao (matte, hắc ín không bóng); đá cốt liệu hơi bóng hơn
 *
 * CÁCH DÙNG: const a = new AsphaltGround({ scale: 1 }); mesh.material = a.getMaterial()
 * DISPOSE: dispose() giải phóng NodeMaterial
 */

import * as THREE from 'three'
import { MeshStandardNodeMaterial } from 'three/webgpu'
import {
  faceDirection,
  float,
  int,
  mix,
  mx_fractal_noise_float,
  normalView,
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

export interface AsphaltGroundOptions {
  /** World-space scale (lớn = hạt nhỏ hơn). Default: 1.0 */
  scale?: number
  /** Màu tar nền (đen hắc ín). Default: 0x121214 */
  baseColor?: THREE.ColorRepresentation
  /** Màu cốt liệu đá rải. Default: 0x4e4e53 */
  aggColor?: THREE.ColorRepresentation
  /** Tần số cốt liệu (1/m). Cao = đá nhỏ/dày. Default: 34 */
  aggScale?: number
  /** Mật độ đá lộ [0–1]. Cao = nhiều đá sáng. Default: 0.55 */
  aggDensity?: number
  /** Biên độ mảng mòn (vệt bánh xe) [0–1]. Default: 0.3 */
  wear?: number
  /** Cường độ normal (hạt cốt liệu). Default: 0.95 */
  bumpScale?: number
}

// ── AsphaltGround ──────────────────────────────────────────────────────────────

export class AsphaltGround {
  private material: MeshStandardNodeMaterial | null = null
  private normalNode: TSLNode | null = null
  private roughnessNode: TSLNode | null = null
  private isDisposed = false

  private readonly uScale:      ReturnType<typeof uniform>
  private readonly uBaseColor:  ReturnType<typeof uniform>
  private readonly uAggColor:   ReturnType<typeof uniform>
  private readonly uAggScale:   ReturnType<typeof uniform>
  private readonly uAggDensity: ReturnType<typeof uniform>
  private readonly uWear:       ReturnType<typeof uniform>
  private readonly uBumpScale:  ReturnType<typeof uniform>

  constructor(opts: AsphaltGroundOptions = {}) {
    this.uScale      = uniform(opts.scale      ?? 1.0)
    this.uBaseColor  = uniform(new THREE.Color(opts.baseColor ?? 0x121214))
    this.uAggColor   = uniform(new THREE.Color(opts.aggColor  ?? 0x4e4e53))
    this.uAggScale   = uniform(opts.aggScale   ?? 34)
    this.uAggDensity = uniform(opts.aggDensity ?? 0.55)
    this.uWear       = uniform(opts.wear       ?? 0.3)
    this.uBumpScale  = uniform(opts.bumpScale  ?? 0.95)

    const mat = new MeshStandardNodeMaterial()
    mat.colorNode = this._buildColorNode()
    mat.normalNode = this.getNormalNode()
    mat.roughnessNode = this.getRoughnessNode()
    mat.metalness = 0
    this.material = mat
  }

  // ── Setters ───────────────────────────────────────────────────────────────

  /** World-space scale. Min 0.001. */
  setScale(v: number): void {
    if (this.isDisposed) return
    this.uScale.value = Math.max(0.001, v)
  }

  /** Mật độ đá cốt liệu lộ [0–1]. */
  setAggDensity(v: number): void {
    if (this.isDisposed) return
    this.uAggDensity.value = Math.max(0, Math.min(1, v))
  }

  getMaterial(): MeshStandardNodeMaterial {
    if (!this.material) throw new Error('AsphaltGround: already disposed')
    return this.material
  }

  /** Normal node (hạt cốt liệu qua screen-space bump + LOD). Lazy cache. */
  getNormalNode(): MeshStandardNodeMaterial['normalNode'] {
    if (this.normalNode === null) this.normalNode = this._buildNormalNode()
    return this.normalNode as MeshStandardNodeMaterial['normalNode']
  }

  /** Roughness node — hắc ín matte (~0.85); đá cốt liệu hơi bóng hơn. */
  getRoughnessNode(): TSLNode {
    return this.roughnessNode ?? (this.roughnessNode = this._buildRoughnessNode())
  }

  /** Cường độ normal [0–2]. */
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

  private _px(): TSLNode {
    return positionWorld.x.mul(this.uScale) as TSLNode
  }
  private _pz(): TSLNode {
    return positionWorld.z.mul(this.uScale) as TSLNode
  }

  // Mặt nạ cốt liệu: noise thresh → đá rải. Dùng chung cho màu + roughness.
  private _aggMask(): TSLNode {
    const agg = triNoise3D(vec3(this._px().mul(this.uAggScale), this._pz().mul(this.uAggScale), float(0)), float(0), float(0))
    const thr = float(1).sub(this.uAggDensity.mul(float(0.5)))
    return smoothstep(thr, float(1), agg) as TSLNode
  }

  // Height: hạt cốt liệu (mid) + tiêu li ti (cao tần, LOD-fade chống lấp lánh ở xa).
  private _heightNode(): TSLNode {
    const px = this._px()
    const pz = this._pz()
    const agg = triNoise3D(vec3(px.mul(this.uAggScale), pz.mul(this.uAggScale), float(0)), float(0), float(0))
    const fw = positionWorld.fwidth()
    const cyc = fw.x.max(fw.z).mul(this.uAggScale.mul(float(2.3)))
    const lod = float(1).sub(smoothstep(float(0.4), float(1.0), cyc))
    const pepper = triNoise3D(vec3(px.mul(this.uAggScale.mul(float(2.3))), pz.mul(this.uAggScale.mul(float(2.3))), float(1)), float(0), float(0))
      .sub(float(0.5))
      .mul(lod)
    // Sần sùi hơn: tăng biên độ hạt cốt liệu + tiêu
    return agg.sub(float(0.5)).mul(float(1.4)).add(pepper.mul(float(0.9))) as TSLNode
  }

  private _buildNormalNode(): TSLNode {
    return this._perturbNormal(this._heightNode())
  }

  private _buildRoughnessNode(): TSLNode {
    // Tar matte (0.88) → đá cốt liệu hơi bóng (0.65) + grain
    const grain = triNoise3D(vec3(this._px().mul(float(10.0)), this._pz().mul(float(10.0)), float(0)), float(0), float(0))
      .sub(float(0.5))
      .mul(float(0.1))
    return mix(float(0.96), float(0.8), this._aggMask()).add(grain).clamp(float(0.65), float(1.0)) as TSLNode
  }

  // Port three BumpMapNode.perturbNormalArb: normal view-space từ screen-space dH.
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
    const { uBaseColor, uAggColor, uAggScale, uWear } = this
    const px = this._px()
    const pz = this._pz()

    // Mảng mòn: fbm tần số thấp → vệt bánh xe đánh bóng sáng ↔ tar mới tối
    const wear = mx_fractal_noise_float(vec3(px.mul(float(0.3)), pz.mul(float(0.3)), float(0)), int(4), float(2.0), float(0.5))
      .mul(float(0.5)).add(float(0.5))
    let col = uBaseColor.mul(float(1).add(wear.sub(float(0.5)).mul(uWear))) as TSLNode

    // Cốt liệu đá xám rải (thresh)
    col = mix(col, uAggColor, this._aggMask().mul(float(0.7))) as TSLNode

    // Grain tiêu li ti → mặt nhám hạt
    const pepper = triNoise3D(vec3(px.mul(uAggScale.mul(float(2.3))), pz.mul(uAggScale.mul(float(2.3))), float(1)), float(0), float(0))
    return col.mul(float(0.85).add(pepper.mul(float(0.3)))) as TSLNode
  }
}
