import * as THREE from 'three'
import { color, float, mix, triNoise3D, uniform, vec3 } from 'three/tsl'
import { GPUParticleSystem } from '../GPUParticleSystem'

export interface FireSystemOptions {
  /** Total particle count split across inner + outer flames. Default: 400 */
  count?: number
  /** Horizontal wind drift — world units/s. Default: 0 */
  windX?: number
  /** Horizontal wind drift — world units/s. Default: 0 */
  windZ?: number
}

export class FireSystem {
  private readonly inner: GPUParticleSystem
  private readonly outer: GPUParticleSystem
  private readonly uWindX = uniform(0.0)
  private readonly uWindZ = uniform(0.0)
  /** Add this to your scene. Move it to reposition the emitter. */
  readonly group: THREE.Group
  private isDisposed = false

  constructor(opts: FireSystemOptions = {}) {
    this.uWindX.value = opts.windX ?? 0
    this.uWindZ.value = opts.windZ ?? 0
    this.group = new THREE.Group()

    // Capture for TSL closure — builder functions execute in GPUParticleSystem constructor
    const uWindX = this.uWindX
    const uWindZ = this.uWindZ

    // Inner flame — fast, hot, narrow cone
    this.inner = new GPUParticleSystem({
      count: Math.floor((opts.count ?? 400) * 0.4),
      lifetime: 0.7,
      shape: 'cone',
      spread: Math.PI / 8,

      buildPosition: ({ aDir, tScaled }) => {
        const rise = vec3(0, 1, 0).mul(float(1.8)).mul(tScaled)
        const drift = aDir.mul(float(0.15)).mul(tScaled)
        const windX = vec3(1, 0, 0).mul(uWindX).mul(tScaled)
        const windZ = vec3(0, 0, 1).mul(uWindZ).mul(tScaled)
        return rise.add(drift).add(windX).add(windZ)
      },
      buildColor: ({ t }) =>
        mix(color(0xffffff), mix(color(0xffaa00), color(0xff2200), t), t),
      buildSize: ({ bell }) => bell.mul(float(7)).add(float(2)),
      buildOpacity: ({ bell }) => bell.mul(float(0.95)),
    })

    // Outer flame — slower, cooler, turbulent wide cone
    this.outer = new GPUParticleSystem({
      count: Math.floor((opts.count ?? 400) * 0.6),
      lifetime: 1.3,
      shape: 'cone',
      spread: Math.PI / 4,

      buildPosition: ({ aDir, tScaled, uTime }) => {
        const rise  = vec3(0, 1, 0).mul(float(1.1)).mul(tScaled)
        const drift = aDir.mul(float(0.35)).mul(tScaled)
        const noise = triNoise3D(rise.mul(float(1.4)), float(0.6), uTime)
        const wobble = vec3(1, 0, 1).mul(noise.sub(float(0.5))).mul(float(0.3))
        const windX  = vec3(1, 0, 0).mul(uWindX).mul(tScaled)
        const windZ  = vec3(0, 0, 1).mul(uWindZ).mul(tScaled)
        return rise.add(drift).add(wobble).add(windX).add(windZ)
      },
      buildColor: ({ t }) => mix(color(0xff7700), color(0x220000), t),
      buildSize: ({ bell }) => bell.mul(float(14)).add(float(3)),
      buildOpacity: ({ bell }) => bell.mul(float(0.65)),
    })

    this.group.add(this.inner.points)
    this.group.add(this.outer.points)
  }

  /** Update wind direction. x/z in world units/s. */
  setWind(x: number, z: number): void {
    if (this.isDisposed) return
    this.uWindX.value = x
    this.uWindZ.value = z
  }

  /** Call every frame — time = clock.getElapsedTime() */
  update(time: number): void {
    if (this.isDisposed) return
    this.inner.update(time)
    this.outer.update(time)
  }

  dispose(): void {
    if (this.isDisposed) return
    this.inner.dispose()
    this.outer.dispose()
    this.isDisposed = true
  }
}
