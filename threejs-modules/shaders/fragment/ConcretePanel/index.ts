/**
 * VỊ TRÍ   — threejs-modules/shaders/fragment/ConcretePanel/index.ts
 * VAI TRÒ  — Procedural concrete panel material — no UV, world-space triplanar
 * LIÊN HỆ  — Phase 6 / 01-Doraemon building system; GLSL reference: shadertoy.glsl
 *
 * Algorithm:
 *   1. Panel seam grid (opRep, no stagger) → smoothstep groove at cell edges
 *   2. fbm surface variation (3 octaves triNoise3D) → pour/aggregate color shift
 *   3. Micro roughness (single triNoise3D, high freq)
 *   4. Triplanar blend using normalWorld abs weights (same as BrickWall)
 *
 * DISPOSE: material.dispose() — no textures owned
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

export interface ConcretePanelOptions {
  /** Panel width in world units. Default: 1.20 m */
  panelW?: number
  /** Panel height in world units. Default: 2.40 m */
  panelH?: number
  /** Seam joint width in world units. Default: 0.010 m */
  seamW?: number
  /** fbm surface colour variation amplitude. Default: 0.055 */
  fbmAmp?: number
  /** Micro-roughness amplitude. Default: 0.018 */
  roughness?: number
  /** Triplanar blend sharpness [1–20]. Default: 8.0 */
  blendSharpness?: number
  /** Panel base colour. Default: 0xacaba4 (concrete grey) */
  baseColor?: THREE.ColorRepresentation
  /** Seam groove colour. Default: 0x706f6a (dark grey) */
  seamColor?: THREE.ColorRepresentation
}

// ── ConcretePanel class ───────────────────────────────────────────────────────

export class ConcretePanel {
  private material: NodeMaterial | null = null
  private isDisposed = false

  private readonly uPanelW: ReturnType<typeof uniform>
  private readonly uPanelH: ReturnType<typeof uniform>
  private readonly uSeamW: ReturnType<typeof uniform>
  private readonly uFbmAmp: ReturnType<typeof uniform>
  private readonly uRoughness: ReturnType<typeof uniform>
  private readonly uBlend: ReturnType<typeof uniform>
  private readonly uBaseColor: ReturnType<typeof uniform>
  private readonly uSeamColor: ReturnType<typeof uniform>

  constructor(opts: ConcretePanelOptions = {}) {
    this.uPanelW    = uniform(opts.panelW         ?? 1.20)
    this.uPanelH    = uniform(opts.panelH         ?? 2.40)
    this.uSeamW     = uniform(opts.seamW          ?? 0.010)
    this.uFbmAmp    = uniform(opts.fbmAmp         ?? 0.055)
    this.uRoughness = uniform(opts.roughness      ?? 0.018)
    this.uBlend     = uniform(opts.blendSharpness ?? 8.0)
    this.uBaseColor = uniform(new THREE.Color(opts.baseColor ?? 0xacaba4))
    this.uSeamColor = uniform(new THREE.Color(opts.seamColor ?? 0x706f6a))

    const mat = new NodeMaterial()
    mat.colorNode = this._buildColorNode()
    this.material = mat
  }

  // ── Setters ────────────────────────────────────────────────────────────────

  /** Panel width in world units. */
  setPanelW(v: number): void {
    if (this.isDisposed) return
    this.uPanelW.value = Math.max(0.1, v)
  }

  /** Panel height in world units. */
  setPanelH(v: number): void {
    if (this.isDisposed) return
    this.uPanelH.value = Math.max(0.1, v)
  }

  /** Seam joint width. Keep below 0.05 for realistic results. */
  setSeamW(v: number): void {
    if (this.isDisposed) return
    this.uSeamW.value = Math.max(0.001, Math.min(0.1, v))
  }

  /** fbm surface colour variation amplitude [0–0.2]. */
  setFbmAmp(v: number): void {
    if (this.isDisposed) return
    this.uFbmAmp.value = Math.max(0, Math.min(0.2, v))
  }

  /** Micro-roughness amplitude [0–0.1]. */
  setRoughness(v: number): void {
    if (this.isDisposed) return
    this.uRoughness.value = Math.max(0, Math.min(0.1, v))
  }

  /** Triplanar blend sharpness [1–20]. Default 8 = crisp. */
  setBlendSharpness(v: number): void {
    if (this.isDisposed) return
    this.uBlend.value = Math.max(1, Math.min(20, v))
  }

  /** Concrete panel base colour. */
  setBaseColor(c: THREE.ColorRepresentation): void {
    if (this.isDisposed) return
    ;(this.uBaseColor.value as THREE.Color).set(c)
  }

  /** Seam groove colour. */
  setSeamColor(c: THREE.ColorRepresentation): void {
    if (this.isDisposed) return
    ;(this.uSeamColor.value as THREE.Color).set(c)
  }

  getMaterial(): NodeMaterial {
    if (!this.material) throw new Error('ConcretePanel: already disposed')
    return this.material
  }

  dispose(): void {
    if (this.isDisposed) return
    this.material?.dispose()
    this.material = null
    this.isDisposed = true
  }

  // ── Private ────────────────────────────────────────────────────────────────

  private _buildColorNode(): TSLNode {
    const {
      uPanelW, uPanelH, uSeamW, uFbmAmp,
      uRoughness, uBlend, uBaseColor, uSeamColor,
    } = this

    // Concrete panel face for one axis-aligned projection
    const concreteFace = (px: TSLNode, py: TSLNode): TSLNode => {
      // ── Panel seam (regular grid, no stagger) ──────────────────────────────
      const su     = px.div(uPanelW)
      const sv     = py.div(uPanelH)

      const localU = su.fract()
      const localV = sv.fract()

      const dU     = min(localU, localU.oneMinus())
      const dV     = min(localV, localV.oneMinus())
      const minDist = min(dU, dV)

      // Seam fraction relative to panel width
      const sFrac   = uSeamW.div(uPanelW)
      // 0 = seam groove, 1 = panel face
      const isPanel = smoothstep(float(0), sFrac.mul(float(2.5)), minDist)

      // ── fbm surface variation — 3 octaves ─────────────────────────────────
      // Low-frequency pour/aggregate colour shift within each panel
      const fbmScale = float(0.9)  // low-freq — large blobs

      const n0 = triNoise3D(vec3(px.mul(fbmScale),        py.mul(fbmScale),        float(0.0)), float(0), float(0))
      const n1 = triNoise3D(vec3(px.mul(fbmScale.mul(2)), py.mul(fbmScale.mul(2)), float(0.5)), float(0), float(0))
      const n2 = triNoise3D(vec3(px.mul(fbmScale.mul(4)), py.mul(fbmScale.mul(4)), float(1.0)), float(0), float(0))

      // Weighted sum → approx fbm [0, 1]
      const fbmVal = n0.mul(float(0.57))
        .add(n1.mul(float(0.28)))
        .add(n2.mul(float(0.14)))
        // Remap [0,1] → [-0.5, 0.5] → scale by amplitude
      const fbmShift = fbmVal.sub(float(0.5)).mul(uFbmAmp)

      // ── Micro roughness — single high-freq noise ────────────────────────────
      const rough = triNoise3D(
        vec3(px.mul(float(22.0)), py.mul(float(22.0)), float(2.3)),
        float(0), float(0),
      ).sub(float(0.5)).mul(uRoughness)

      // ── Colour composition ──────────────────────────────────────────────────
      const panelCol = uBaseColor.add(vec3(fbmShift.add(rough)))
      const blended  = mix(uSeamColor, panelCol, isPanel)

      // AO: slightly darken at seam edges
      const ao = isPanel.mul(float(0.10)).add(float(0.90))
      return blended.mul(ao)
    }

    // Three axis-aligned projections
    const colXY = concreteFace(positionWorld.x, positionWorld.y)
    const colZY = concreteFace(positionWorld.z, positionWorld.y)
    const colXZ = concreteFace(positionWorld.x, positionWorld.z)

    // Triplanar blend weights
    const absN   = normalWorld.abs()
    const sharp  = absN.pow(vec3(uBlend))
    const wSum   = sharp.dot(vec3(1.0)).max(float(0.001))
    const w      = sharp.div(wSum)

    return colZY.mul(w.x).add(colXZ.mul(w.y)).add(colXY.mul(w.z))
  }
}
