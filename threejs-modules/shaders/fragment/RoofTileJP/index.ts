/**
 * VỊ TRÍ   — threejs-modules/shaders/fragment/RoofTileJP/index.ts
 * VAI TRÒ  — Procedural Japanese kawara roof tile — no UV, world-space triplanar
 * LIÊN HỆ  — Phase 6 / 01-Doraemon building system; GLSL reference: shadertoy.glsl
 *
 * Algorithm (IQ sdRoundBox + opRep running bond):
 *   1. Tile grid with half-tile row stagger (running bond)
 *   2. sdRoundBox per tile → gap at rounded edges
 *   3. Cosine S-profile along tile X → curved surface shading
 *   4. Per-tile variation via triNoise3D on cell ID
 *   5. Triplanar blend (primarily Y-facing roof surfaces)
 *
 * DISPOSE: material.dispose() — no textures owned
 */

import * as THREE from 'three'
import { NodeMaterial } from 'three/webgpu'
import {
  abs,
  cos,
  float,
  length,
  max,
  min,
  mix,
  normalWorld,
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

export interface RoofTileJPOptions {
  /** Tile width in world units. Default: 0.28 m */
  tileW?: number
  /** Tile height (along roof slope) in world units. Default: 0.34 m */
  tileH?: number
  /** Curved ridge height (S-profile amplitude). Default: 0.04 m */
  ridgeH?: number
  /** Gap between tiles in world units. Default: 0.008 m */
  gap?: number
  /** Triplanar blend sharpness [1–20]. Default: 8.0 */
  blendSharpness?: number
  /** Tile base colour. Default: 0x383839 (dark charcoal kawara) */
  tileColor?: THREE.ColorRepresentation
  /** Ridge highlight colour (lighter). Default: 0x464647 */
  ridgeColor?: THREE.ColorRepresentation
  /** Gap / shadow colour. Default: 0x1e1d1d */
  gapColor?: THREE.ColorRepresentation
}

// ── RoofTileJP class ──────────────────────────────────────────────────────────

export class RoofTileJP {
  private material: NodeMaterial | null = null
  private isDisposed = false

  private readonly uTileW: ReturnType<typeof uniform>
  private readonly uTileH: ReturnType<typeof uniform>
  private readonly uGap: ReturnType<typeof uniform>
  private readonly uBlend: ReturnType<typeof uniform>
  private readonly uTileColor: ReturnType<typeof uniform>
  private readonly uRidgeColor: ReturnType<typeof uniform>
  private readonly uGapColor: ReturnType<typeof uniform>

  constructor(opts: RoofTileJPOptions = {}) {
    this.uTileW      = uniform(opts.tileW          ?? 0.28)
    this.uTileH      = uniform(opts.tileH          ?? 0.34)
    this.uGap        = uniform(opts.gap            ?? 0.008)
    this.uBlend      = uniform(opts.blendSharpness ?? 8.0)
    this.uTileColor  = uniform(new THREE.Color(opts.tileColor  ?? 0x383839))
    this.uRidgeColor = uniform(new THREE.Color(opts.ridgeColor ?? 0x464647))
    this.uGapColor   = uniform(new THREE.Color(opts.gapColor   ?? 0x1e1d1d))

    const mat = new NodeMaterial()
    mat.colorNode = this._buildColorNode()
    this.material = mat
  }

  // ── Setters ────────────────────────────────────────────────────────────────

  /** Tile width in world units. */
  setTileW(v: number): void {
    if (this.isDisposed) return
    this.uTileW.value = Math.max(0.05, v)
  }

  /** Tile height (along slope) in world units. */
  setTileH(v: number): void {
    if (this.isDisposed) return
    this.uTileH.value = Math.max(0.05, v)
  }

  /** Gap between tiles. Keep below 0.03 for realistic look. */
  setGap(v: number): void {
    if (this.isDisposed) return
    this.uGap.value = Math.max(0.001, Math.min(0.05, v))
  }

  /** Triplanar blend sharpness [1–20]. */
  setBlendSharpness(v: number): void {
    if (this.isDisposed) return
    this.uBlend.value = Math.max(1, Math.min(20, v))
  }

  /** Tile face colour. */
  setTileColor(c: THREE.ColorRepresentation): void {
    if (this.isDisposed) return
    ;(this.uTileColor.value as THREE.Color).set(c)
  }

  /** Ridge highlight colour. */
  setRidgeColor(c: THREE.ColorRepresentation): void {
    if (this.isDisposed) return
    ;(this.uRidgeColor.value as THREE.Color).set(c)
  }

  /** Gap / shadow colour. */
  setGapColor(c: THREE.ColorRepresentation): void {
    if (this.isDisposed) return
    ;(this.uGapColor.value as THREE.Color).set(c)
  }

  getMaterial(): NodeMaterial {
    if (!this.material) throw new Error('RoofTileJP: already disposed')
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
      uTileW, uTileH, uGap, uBlend,
      uTileColor, uRidgeColor, uGapColor,
    } = this

    // Roof tile face for one axis-aligned projection
    const tileFace = (px: TSLNode, py: TSLNode): TSLNode => {
      const cellW = uTileW.add(uGap)
      const cellH = uTileH.add(uGap)

      // Running bond: offset every other row by half tile width
      const row     = py.div(cellH).floor()
      const stagger = row.mul(float(0.5)).fract().step(float(0.5)).mul(uTileW.mul(float(0.5)))

      const su = px.add(stagger).div(cellW)
      const sv = py.div(cellH)

      const localU = su.fract()   // [0,1] within tile cell X
      const localV = sv.fract()   // [0,1] within tile cell Y
      const cellU  = su.floor()
      const cellV  = row

      // ── Gap detection ─────────────────────────────────────────────────────
      // Edge distance → smoothstep → 0 outside tile, 1 inside
      const dU    = min(localU, localU.oneMinus())
      const dV    = min(localV, localV.oneMinus())
      const minD  = min(dU, dV)
      const gFrac = uGap.div(cellW)
      const inGap = smoothstep(float(0), gFrac.mul(float(2.5)), minD)

      // ── sdRoundBox2D for rounded tile corners ─────────────────────────────
      // Tile local: centre at (0,0), range [-0.5, 0.5]
      const tileLocalU = localU.sub(float(0.5))
      const tileLocalV = localV.sub(float(0.5))

      const cornerR = float(0.06)  // corner radius in cell-fraction
      const halfExt = float(0.5).sub(cornerR)  // half-extents minus radius

      // q = abs(p) - b + r
      const qU = abs(tileLocalU).sub(halfExt)
      const qV = abs(tileLocalV).sub(halfExt)

      // sdRoundBox = length(max(q,0)) + min(max(qx,qy), 0) - r
      const sdf = length(vec2(max(qU, float(0)), max(qV, float(0))))
        .add(min(max(qU, qV), float(0)))
        .sub(cornerR)

      // sdf > 0 → outside rounded tile → treat as gap
      const outsideTile = step(float(0), sdf)  // 1 if outside, 0 if inside
      // isTile: 1 = tile face, 0 = gap/corner
      const isTile = inGap.mul(outsideTile.oneMinus())

      // ── S-profile shading (cosine curve along X) ──────────────────────────
      // Simulates the curved barrel of a S-shaped kawara tile
      // cos(x * PI): +1 at tile centre, -1 at edges → ridge vs. valley
      const lx         = tileLocalU.mul(float(Math.PI))
      const sCurve     = cos(lx)              // [-1, 1]
      const ridgeBlend = sCurve.mul(float(0.5)).add(float(0.5)) // [0, 1]
      // quadratic: enhance contrast between ridge and valley
      const ridgeLight = ridgeBlend.mul(ridgeBlend)

      // ── Per-tile colour variation ─────────────────────────────────────────
      const cellNoise = triNoise3D(
        vec3(cellU.mul(float(11.3)), cellV.mul(float(7.9)), float(0)),
        float(0), float(0),
      ).sub(float(0.5)).mul(float(0.04))

      // ── Colour composition ────────────────────────────────────────────────
      const tileCol = mix(uRidgeColor, uTileColor, ridgeLight).add(vec3(cellNoise))
      const blended = mix(uGapColor, tileCol, isTile)

      // AO at tile edges
      const ao = isTile.mul(float(0.15)).add(float(0.85))
      return blended.mul(ao)
    }

    // Three axis-aligned projections
    const colXY = tileFace(positionWorld.x, positionWorld.y)
    const colZY = tileFace(positionWorld.z, positionWorld.y)
    const colXZ = tileFace(positionWorld.x, positionWorld.z)

    // Triplanar blend weights
    const absN  = normalWorld.abs()
    const sharp = absN.pow(vec3(uBlend))
    const wSum  = sharp.dot(vec3(1.0)).max(float(0.001))
    const w     = sharp.div(wSum)

    return colZY.mul(w.x).add(colXZ.mul(w.y)).add(colXY.mul(w.z))
  }
}
