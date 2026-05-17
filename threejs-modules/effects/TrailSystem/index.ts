import * as THREE from 'three'
import { BaseGPUEffect } from '../BaseGPUEffect'

export interface TrailSystemOptions {
  /** Max positions kept in trail history. Default: 40 */
  maxLength?: number
  /** Ribbon width in world units. Default: 0.08 */
  width?: number
  /** Color at trail head (newest). Default: 0xffffff */
  headColor?: THREE.ColorRepresentation
}

const _UP = new THREE.Vector3(0, 1, 0)

export class TrailSystem extends BaseGPUEffect {
  private readonly geo: THREE.BufferGeometry
  private readonly mat: THREE.MeshBasicMaterial
  readonly root: THREE.Mesh
  private readonly positions: THREE.Vector3[] = []
  private readonly maxLength: number
  private width: number
  private readonly headColor: THREE.Color
  private readonly _tangent = new THREE.Vector3()
  private readonly _camDir  = new THREE.Vector3()
  private readonly _side    = new THREE.Vector3()

  constructor(opts: TrailSystemOptions = {}) {
    super()
    this.maxLength = Math.max(2, opts.maxLength ?? 40)
    this.width     = opts.width ?? 0.08
    this.headColor = new THREE.Color(opts.headColor ?? 0xffffff)

    this.geo = new THREE.BufferGeometry()

    const verts   = new Float32Array(this.maxLength * 2 * 3)
    const colors  = new Float32Array(this.maxLength * 2 * 3)
    const indices = new Uint16Array((this.maxLength - 1) * 6)

    this.geo.setAttribute('position', new THREE.BufferAttribute(verts,  3))
    this.geo.setAttribute('color',    new THREE.BufferAttribute(colors, 3))

    // Pre-build index strip — static, only draw range changes
    for (let i = 0; i < this.maxLength - 1; i++) {
      const b = i * 2
      indices[i * 6 + 0] = b;     indices[i * 6 + 1] = b + 1; indices[i * 6 + 2] = b + 2
      indices[i * 6 + 3] = b + 1; indices[i * 6 + 4] = b + 3; indices[i * 6 + 5] = b + 2
    }
    this.geo.setIndex(new THREE.BufferAttribute(indices, 1))
    this.geo.setDrawRange(0, 0)

    this.mat = new THREE.MeshBasicMaterial({
      vertexColors: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      side: THREE.DoubleSide,
    })

    this.root = new THREE.Mesh(this.geo, this.mat)
  }

  /**
   * Push new position and rebuild ribbon.
   * Call every frame — pass camera for billboard-facing orientation.
   */
  update(position: THREE.Vector3, camera: THREE.Camera): void {
    if (this.isDisposed) return

    this.positions.push(position.clone())
    if (this.positions.length > this.maxLength) this.positions.shift()

    const n = this.positions.length
    if (n < 2) { this.geo.setDrawRange(0, 0); return }

    this.rebuildGeometry(camera, n)
  }

  setWidth(value: number): void {
    this.width = Math.max(0.001, value)
  }

  private rebuildGeometry(camera: THREE.Camera, n: number): void {
    const posArr   = this.geo.attributes['position'].array as Float32Array
    const colorArr = this.geo.attributes['color'].array as Float32Array
    const hr = this.headColor.r
    const hg = this.headColor.g
    const hb = this.headColor.b
    const hw = this.width * 0.5

    for (let i = 0; i < n; i++) {
      const p    = this.positions[i]
      const next = this.positions[Math.min(i + 1, n - 1)]
      const prev = this.positions[Math.max(i - 1, 0)]

      this._tangent.subVectors(next, prev)
      if (this._tangent.lengthSq() < 1e-8) this._tangent.set(0, 1, 0)
      else this._tangent.normalize()

      this._camDir.subVectors(camera.position, p).normalize()
      this._side.crossVectors(this._tangent, this._camDir)
      if (this._side.lengthSq() < 1e-8) this._side.crossVectors(this._tangent, _UP)
      this._side.normalize()

      const u  = i / (n - 1)  // 0 = tail (oldest), 1 = head (newest)
      const vi = i * 2

      posArr[vi * 3 + 0] = p.x + this._side.x * hw
      posArr[vi * 3 + 1] = p.y + this._side.y * hw
      posArr[vi * 3 + 2] = p.z + this._side.z * hw
      posArr[(vi + 1) * 3 + 0] = p.x - this._side.x * hw
      posArr[(vi + 1) * 3 + 1] = p.y - this._side.y * hw
      posArr[(vi + 1) * 3 + 2] = p.z - this._side.z * hw

      // Fade toward tail: black = transparent with additive blending
      for (const offset of [0, 1]) {
        colorArr[(vi + offset) * 3 + 0] = hr * u
        colorArr[(vi + offset) * 3 + 1] = hg * u
        colorArr[(vi + offset) * 3 + 2] = hb * u
      }
    }

    this.geo.attributes['position'].needsUpdate = true
    this.geo.attributes['color'].needsUpdate = true
    this.geo.setDrawRange(0, (n - 1) * 6)
  }

  protected onDispose(): void {
    this.geo.dispose()
    this.mat.dispose()
  }
}
