/**
 * VỊ TRÍ   — threejs-modules/shaders/fragment/Weathering/index.ts
 * VAI TRÒ  — TSL NodeMaterial: layered weathering — moss, dirt streak, rust, rain stain
 * LIÊN HỆ  — dùng triplanar world-space; shadertoy.glsl là reference GLSL
 *
 * CÁCH DÙNG:
 *   const wear = new Weathering({ baseColor: 0xd0c8b4, mossAmt: 0.5 })
 *   mesh.material = wear.getMaterial()
 *   wear.dispose()
 *
 * DISPOSE: dispose() giải phóng NodeMaterial
 *
 * 4 blend layers (từ dưới lên):
 *   base → moss (low + fbm) → dirt streak (elongated fbm) → rust patches → rain stain
 * Mỗi layer có amount uniform riêng để enable/disable runtime.
 */

import * as THREE from 'three'
import { NodeMaterial } from 'three/webgpu'
import {
  float,
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

export interface WeatheringOptions {
  /** World-space scale. Default: 1.0 */
  scale?: number
  /** Clean surface base color. Default: plaster white */
  baseColor?: THREE.ColorRepresentation
  /** Moss green color. Default: dark green */
  mossColor?: THREE.ColorRepresentation
  /** Dirt/grime color. Default: brown */
  dirtColor?: THREE.ColorRepresentation
  /** Rust/oxide color. Default: iron orange */
  rustColor?: THREE.ColorRepresentation
  /** Rain stain color. Default: lighter dust smear */
  stainColor?: THREE.ColorRepresentation
  /** Moss layer intensity (0=none, 1=full). Default: 0.55 */
  mossAmt?: number
  /** Dirt streak intensity. Default: 0.45 */
  dirtAmt?: number
  /** Rust patch intensity. Default: 0.30 */
  rustAmt?: number
  /** Rain stain streak intensity. Default: 0.35 */
  stainAmt?: number
}

// ── Weathering ────────────────────────────────────────────────────────────────

export class Weathering {
  private material: NodeMaterial | null = null
  private isDisposed = false

  private readonly uScale:      ReturnType<typeof uniform>
  private readonly uBaseColor:  ReturnType<typeof uniform>
  private readonly uMossColor:  ReturnType<typeof uniform>
  private readonly uDirtColor:  ReturnType<typeof uniform>
  private readonly uRustColor:  ReturnType<typeof uniform>
  private readonly uStainColor: ReturnType<typeof uniform>
  private readonly uMossAmt:    ReturnType<typeof uniform>
  private readonly uDirtAmt:    ReturnType<typeof uniform>
  private readonly uRustAmt:    ReturnType<typeof uniform>
  private readonly uStainAmt:   ReturnType<typeof uniform>

  constructor(opts: WeatheringOptions = {}) {
    this.uScale      = uniform(opts.scale    ?? 1.0)
    this.uBaseColor  = uniform(new THREE.Color(opts.baseColor  ?? 0xd0c8b4))
    this.uMossColor  = uniform(new THREE.Color(opts.mossColor  ?? 0x476037))
    this.uDirtColor  = uniform(new THREE.Color(opts.dirtColor  ?? 0x594733))
    this.uRustColor  = uniform(new THREE.Color(opts.rustColor  ?? 0x9e4d1a))
    this.uStainColor = uniform(new THREE.Color(opts.stainColor ?? 0x99918f))
    this.uMossAmt    = uniform(opts.mossAmt  ?? 0.55)
    this.uDirtAmt    = uniform(opts.dirtAmt  ?? 0.45)
    this.uRustAmt    = uniform(opts.rustAmt  ?? 0.30)
    this.uStainAmt   = uniform(opts.stainAmt ?? 0.35)

    const mat = new NodeMaterial()
    mat.colorNode = this._buildColorNode()
    this.material = mat
  }

  // ── Setters ───────────────────────────────────────────────────────────────

  setScale(v: number): void {
    if (this.isDisposed) return
    this.uScale.value = Math.max(0.001, v)
  }

  /** Moss intensity. Range: 0–1 */
  setMossAmt(v: number): void {
    if (this.isDisposed) return
    this.uMossAmt.value = Math.max(0, Math.min(1, v))
  }

  /** Dirt streak intensity. Range: 0–1 */
  setDirtAmt(v: number): void {
    if (this.isDisposed) return
    this.uDirtAmt.value = Math.max(0, Math.min(1, v))
  }

  /** Rust intensity. Range: 0–1 */
  setRustAmt(v: number): void {
    if (this.isDisposed) return
    this.uRustAmt.value = Math.max(0, Math.min(1, v))
  }

  /** Rain stain intensity. Range: 0–1 */
  setStainAmt(v: number): void {
    if (this.isDisposed) return
    this.uStainAmt.value = Math.max(0, Math.min(1, v))
  }

  setBaseColor(c: THREE.ColorRepresentation): void {
    if (this.isDisposed) return
    ;(this.uBaseColor.value as THREE.Color).set(c)
  }

  getMaterial(): NodeMaterial {
    if (!this.material) throw new Error('Weathering: đã dispose')
    return this.material
  }

  dispose(): void {
    if (this.isDisposed) return
    this.material?.dispose()
    this.material = null
    this.isDisposed = true
  }

  // ── TSL node graph ────────────────────────────────────────────────────────

  private _buildColorNode(): TSLNode {
    const { uScale } = this

    // Three projections
    const colXY = this._weatherFace(positionWorld.x.mul(uScale), positionWorld.y.mul(uScale))
    const colZY = this._weatherFace(positionWorld.z.mul(uScale), positionWorld.y.mul(uScale))
    const colXZ = this._weatherFace(positionWorld.x.mul(uScale), positionWorld.z.mul(uScale))

    // Triplanar weights
    const absN  = normalWorld.abs()
    const sharp = absN.pow(vec3(8.0))
    const wSum  = sharp.dot(vec3(1.0)).max(float(0.001))
    const w     = sharp.div(wSum)

    return colZY.mul(w.x).add(colXZ.mul(w.y)).add(colXY.mul(w.z)) as TSLNode
  }

  /**
   * Weathering layers for one projection.
   * pu = horizontal, pv = vertical (Y in world space = height for vertical walls).
   */
  private _weatherFace(pu: TSLNode, pv: TSLNode): TSLNode {
    const {
      uBaseColor, uMossColor, uDirtColor, uRustColor, uStainColor,
      uMossAmt, uDirtAmt, uRustAmt, uStainAmt,
    } = this

    // ── Layer 1: Moss ─────────────────────────────────────────────────────────
    // Moss accumulates low on wall (low pv) and in fbm-shaped patches
    const mossN0 = triNoise3D(vec3(pu.mul(float(0.8)).add(float(1.1)), pv.mul(float(0.8)).add(float(2.3)), float(0)), float(0), float(0))
    const mossN1 = triNoise3D(vec3(pu.mul(float(1.7)).add(float(3.7)), pv.mul(float(1.7)).add(float(0.9)), float(1)), float(0), float(0))
    const mossN2 = triNoise3D(vec3(pu.mul(float(3.6)).add(float(2.1)), pv.mul(float(3.6)).add(float(5.4)), float(2)), float(0), float(0))
    const mossFbm   = mossN0.mul(float(0.57)).add(mossN1.mul(float(0.28))).add(mossN2.mul(float(0.14)))
    const mossLow   = smoothstep(float(0.7), float(0.3), pv)           // stronger at bottom
    const mossMask  = smoothstep(float(0.35), float(0.65), mossFbm.mul(mossLow)).mul(uMossAmt)
    let col: TSLNode = mix(uBaseColor, uMossColor, mossMask) as TSLNode

    // ── Layer 2: Dirt streak ──────────────────────────────────────────────────
    // Stretched noise along Y (V) → vertical streak look
    const dirtN0 = triNoise3D(vec3(pu.mul(float(1.5)).add(float(5.7)), pv.mul(float(0.3)), float(3)), float(0), float(0))
    const dirtN1 = triNoise3D(vec3(pu.mul(float(3.0)).add(float(2.1)), pv.mul(float(0.6)).add(float(1.0)), float(4)), float(0), float(0))
    const dirtN2 = triNoise3D(vec3(pu.mul(float(6.3)).add(float(7.5)), pv.mul(float(1.2)).add(float(3.3)), float(5)), float(0), float(0))
    const dirtFbm  = dirtN0.mul(float(0.57)).add(dirtN1.mul(float(0.28))).add(dirtN2.mul(float(0.14)))
    const dirtMask = smoothstep(float(0.45), float(0.65), dirtFbm).mul(uDirtAmt)
    col = mix(col, uDirtColor, dirtMask) as TSLNode

    // ── Layer 3: Rust patches ─────────────────────────────────────────────────
    const rustN0 = triNoise3D(vec3(pu.mul(float(2.2)).add(float(8.1)), pv.mul(float(2.2)).add(float(3.5)), float(6)), float(0), float(0))
    const rustN1 = triNoise3D(vec3(pu.mul(float(4.6)).add(float(1.4)), pv.mul(float(4.6)).add(float(6.2)), float(7)), float(0), float(0))
    const rustN2 = triNoise3D(vec3(pu.mul(float(9.7)).add(float(4.3)), pv.mul(float(9.7)).add(float(0.8)), float(8)), float(0), float(0))
    const rustFbm  = rustN0.mul(float(0.57)).add(rustN1.mul(float(0.28))).add(rustN2.mul(float(0.14)))
    // Rust stronger at bottom
    const rustLow  = float(0.5).add(smoothstep(float(0.8), float(0.2), pv).mul(float(0.5)))
    const rustMask = smoothstep(float(0.50), float(0.72), rustFbm).mul(rustLow).mul(uRustAmt)
    col = mix(col, uRustColor, rustMask) as TSLNode

    // ── Layer 4: Rain stain streak ────────────────────────────────────────────
    // Only varies by X (pu), uniform along Y → straight vertical streaks
    const stainN = triNoise3D(vec3(pu.mul(float(4.0)), float(0), float(9)), float(0), float(0))
    const stainEdge = smoothstep(float(0.6), float(0.75), stainN)
    // Fade at very top and at bottom (covered by moss)
    const stainFade = smoothstep(float(0.0), float(0.3), pv).mul(smoothstep(float(1.2), float(0.7), pv))
    const stainMask = stainEdge.mul(stainFade).mul(uStainAmt)
    col = mix(col, uStainColor, stainMask) as TSLNode

    return col
  }
}
