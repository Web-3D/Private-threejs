import * as THREE from 'three'

export interface OutlineShaderOptions {
  /** Outline color. Default: 0x00ffff */
  color?: THREE.ColorRepresentation
  /**
   * Scale delta added to 1.0 — e.g. 0.03 means mesh scaled to 1.03.
   * Smaller value = thinner outline. Default: 0.03
   */
  thickness?: number
}

/**
 * Per-object outline using BackSide scaled mesh — no post-processing required.
 * Adds an outline child to sourceMesh automatically. Follows parent transform.
 *
 * Limitation: outline visible through the object if camera enters it.
 * For overlapping objects, use OutlinePass (post-processing) instead.
 */
export class OutlineShader {
  private readonly outlineMesh: THREE.Mesh
  private readonly outlineMat: THREE.MeshBasicMaterial
  private isDisposed = false

  constructor(sourceMesh: THREE.Mesh, opts: OutlineShaderOptions = {}) {
    this.outlineMat = new THREE.MeshBasicMaterial({
      color: opts.color ?? 0x00ffff,
      side: THREE.BackSide,
      depthWrite: false,
    })

    // Share source geometry — outline scales up, BackSide shows rim
    this.outlineMesh = new THREE.Mesh(sourceMesh.geometry, this.outlineMat)
    this.outlineMesh.scale.setScalar(1 + (opts.thickness ?? 0.03))

    // Add as child — follows source mesh transform automatically
    sourceMesh.add(this.outlineMesh)
  }

  setColor(hex: THREE.ColorRepresentation): void {
    if (this.isDisposed) return
    this.outlineMat.color.set(hex)
  }

  /** thickness = scale delta above 1.0. e.g. 0.05 = 5% larger. */
  setThickness(value: number): void {
    if (this.isDisposed) return
    this.outlineMesh.scale.setScalar(1 + Math.max(0, value))
  }

  setVisible(v: boolean): void {
    this.outlineMesh.visible = v
  }

  dispose(): void {
    if (this.isDisposed) return
    this.outlineMesh.parent?.remove(this.outlineMesh)
    this.outlineMat.dispose()
    // Geometry NOT disposed — owned by sourceMesh
    this.isDisposed = true
  }
}
