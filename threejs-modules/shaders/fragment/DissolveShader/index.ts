import * as THREE from 'three'
import { NodeMaterial } from 'three/webgpu'
import { color, float, mix, positionWorld, smoothstep, step, texture, triNoise3D, uniform } from 'three/tsl'

export interface DissolveShaderOptions {
  /** Base object color. Ignored if map is provided. Default: 0xffffff */
  baseColor?: THREE.ColorRepresentation
  /** Texture map. Replaces baseColor if provided. */
  map?: THREE.Texture
  /** Edge glow color at dissolve boundary. Default: 0x00ffff */
  edgeColor?: THREE.ColorRepresentation
  /** Glow band width in noise space [0-1]. Default: 0.08 */
  edgeWidth?: number
  /** World-space noise scale — larger = finer grain. Default: 2.0 */
  scale?: number
}

export class DissolveShader {
  private material: NodeMaterial | null = null
  private readonly uTime = uniform(0.0)
  private readonly uDissolve = uniform(0.0)
  private readonly uEdgeWidth: ReturnType<typeof uniform>
  private readonly uScale: ReturnType<typeof uniform>
  private animState: 'idle' | 'out' | 'in' = 'idle'
  private animStart = 0
  private animFrom = 0
  private animTo = 0
  private animDuration = 0
  private isDisposed = false

  constructor(opts: DissolveShaderOptions = {}) {
    this.uEdgeWidth = uniform(opts.edgeWidth ?? 0.08)
    this.uScale     = uniform(opts.scale ?? 2.0)

    const baseColorNode = opts.map !== undefined
      ? texture(opts.map)
      : color(opts.baseColor ?? 0xffffff)

    const edgeColorNode = color(opts.edgeColor ?? 0x00ffff)

    const noiseVal   = triNoise3D(positionWorld.mul(this.uScale), float(0.5), this.uTime)
    const visible    = step(this.uDissolve, noiseVal)
    const edgeBlend  = smoothstep(this.uDissolve, this.uDissolve.add(this.uEdgeWidth), noiseVal)

    const mat = new NodeMaterial()
    mat.colorNode   = mix(edgeColorNode, baseColorNode, edgeBlend)
    mat.opacityNode = visible
    mat.transparent = true
    mat.side        = THREE.DoubleSide
    this.material   = mat
  }

  /** Animate from solid to fully dissolved over the given duration in seconds. */
  dissolveOut(duration: number, currentTime: number): void {
    if (this.isDisposed) return
    this.animFrom     = this.uDissolve.value
    this.animTo       = 1.0
    this.animStart    = currentTime
    this.animDuration = Math.max(0.001, duration)
    this.animState    = 'out'
  }

  /** Animate from fully dissolved to solid over the given duration in seconds. */
  dissolveIn(duration: number, currentTime: number): void {
    if (this.isDisposed) return
    this.animFrom     = this.uDissolve.value
    this.animTo       = 0.0
    this.animStart    = currentTime
    this.animDuration = Math.max(0.001, duration)
    this.animState    = 'in'
  }

  /** Set dissolve factor directly. 0 = solid, 1 = fully dissolved. */
  setDissolveFactor(value: number): void {
    if (this.isDisposed) return
    this.uDissolve.value = Math.max(0, Math.min(1, value))
    this.animState = 'idle'
  }

  setEdgeWidth(value: number): void {
    if (this.isDisposed) return
    this.uEdgeWidth.value = Math.max(0, Math.min(0.5, value))
  }

  setScale(value: number): void {
    if (this.isDisposed) return
    this.uScale.value = Math.max(0.01, value)
  }

  /** Call every frame — time = clock.getElapsedTime() */
  update(time: number): void {
    if (this.isDisposed) return
    this.uTime.value = time
    if (this.animState !== 'idle') {
      const t = Math.min(1, (time - this.animStart) / this.animDuration)
      this.uDissolve.value = this.animFrom + (this.animTo - this.animFrom) * t
      if (t >= 1) this.animState = 'idle'
    }
  }

  getMaterial(): NodeMaterial {
    if (!this.material) throw new Error('DissolveShader: already disposed')
    return this.material
  }

  dispose(): void {
    if (this.isDisposed) return
    this.material?.dispose()
    this.material = null
    this.isDisposed = true
  }
}
