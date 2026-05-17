import * as THREE from 'three'
import { color, float, mix, triNoise3D, uniform, vec3 } from 'three/tsl'
import { GPUParticleSystem } from '../GPUParticleSystem'
import type { ParticleShape } from '../GPUParticleSystem'
import { BaseGPUEffect } from '../BaseGPUEffect'

export type SparkShape = ParticleShape

export interface SparkSystemOptions {
  count?: number
  lifetime?: number
  speed?: number
  gravity?: number
  spread?: number
  sizeMin?: number
  sizeMax?: number
  colorHot?: THREE.ColorRepresentation
  colorCold?: THREE.ColorRepresentation
  turbulence?: boolean
  shape?: SparkShape
}

export class SparkSystem extends BaseGPUEffect {
  private readonly uSpeed = uniform(4.0)
  private readonly uGravity = uniform(4.0)
  private readonly uSizeMin = uniform(2.0)
  private readonly uSizeMax = uniform(6.0)
  private readonly system: GPUParticleSystem
  readonly root = new THREE.Group()

  constructor(opts: SparkSystemOptions = {}) {
    super()
    this.uSpeed.value = opts.speed ?? 4.0
    this.uGravity.value = opts.gravity ?? 4.0
    this.uSizeMin.value = opts.sizeMin ?? 2.0
    this.uSizeMax.value = opts.sizeMax ?? 6.0

    // Capture for closure — builder functions run in GPUParticleSystem constructor
    const uSpeed = this.uSpeed
    const uGravity = this.uGravity
    const uSizeMin = this.uSizeMin
    const uSizeMax = this.uSizeMax
    const turbulence = opts.turbulence ?? false
    const colorHot = color(opts.colorHot ?? 0xffee88)
    const colorCold = color(opts.colorCold ?? 0xcc2200)

    this.system = new GPUParticleSystem({
      count: opts.count ?? 300,
      lifetime: opts.lifetime ?? 1.5,
      shape: opts.shape ?? 'cone',
      spread: opts.spread ?? Math.PI / 4,

      buildPosition: ({ aDir, tScaled, uTime }) => {
        const traj = aDir
          .mul(uSpeed)
          .mul(tScaled)
          .add(vec3(0, -1, 0).mul(uGravity.mul(float(0.5)).mul(tScaled.mul(tScaled))))
        if (!turbulence) return traj
        const noise = triNoise3D(traj.mul(float(2.0)), float(0.8), uTime)
        return traj.add(vec3(1, 0, 1).mul(noise.sub(float(0.5))).mul(float(0.3)))
      },

      buildColor: ({ t }) => mix(colorHot, colorCold, t),
      buildSize: ({ bell }) => mix(uSizeMin, uSizeMax, bell),
      buildOpacity: ({ bell }) => bell,
    })
    this.root.add(this.system.points)
  }

  update(time: number): void {
    if (this.isDisposed) return
    this.system.update(time)
  }

  setSpeed(value: number): void {
    if (this.isDisposed) return
    this.uSpeed.value = Math.max(0, value)
  }

  setGravity(value: number): void {
    if (this.isDisposed) return
    this.uGravity.value = Math.max(0, value)
  }

  setLifetime(value: number): void {
    if (this.isDisposed) return
    this.system.setLifetime(value)
  }

  protected onDispose(): void {
    this.system.dispose()
  }
}
