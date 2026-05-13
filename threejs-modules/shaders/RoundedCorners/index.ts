import { NodeMaterial } from 'three/webgpu'
import { abs, color, float, length, max, min, negate, oneMinus, smoothstep, uv, vec2 } from 'three/tsl'
import type * as THREE from 'three'

export interface RoundedCornersOptions {
  /** Corner radius as fraction of panel half-size [0, 0.5]. Default: 0.1 */
  radius?: number
  /** Fill color. Default: 0xffffff */
  fillColor?: THREE.ColorRepresentation
  /** SDF edge anti-alias width in UV space. Default: 0.005 */
  edgeSoftness?: number
}

export class RoundedCorners {
  private material: NodeMaterial | null = null
  private isDisposed = false

  constructor(opts: RoundedCornersOptions = {}) {
    const r = Math.min(0.5, Math.max(0, opts.radius ?? 0.1))
    const softness = Math.max(0.001, opts.edgeSoftness ?? 0.005)

    // UV range [0,1] → center at (0,0), range [-0.5, 0.5]
    const p = uv().sub(0.5)
    const rNode = float(r)
    const bNode = vec2(0.5 - r, 0.5 - r)

    // SDF of rounded rectangle:
    //   q = abs(p) - b + r
    //   sdf = length(max(q, 0)) + min(max(q.x, q.y), 0) - r
    const q = abs(p).sub(bNode).add(rNode)
    const sdf = length(max(q, 0.0)).add(min(max(q.x, q.y), 0.0)).sub(rNode)

    // Alpha: 1 inside, smooth transition at boundary, 0 outside
    const alpha = oneMinus(smoothstep(negate(float(softness)), float(softness), sdf))

    const mat = new NodeMaterial()
    mat.colorNode = color(opts.fillColor ?? 0xffffff)
    mat.opacityNode = alpha
    mat.transparent = true
    mat.depthWrite = false
    this.material = mat
  }

  getMaterial(): NodeMaterial {
    if (!this.material) throw new Error('RoundedCorners: already disposed')
    return this.material
  }

  dispose(): void {
    if (this.isDisposed) return
    this.material?.dispose()
    this.material = null
    this.isDisposed = true
  }
}
