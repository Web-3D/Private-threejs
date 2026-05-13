import * as THREE from 'three'
import { PointsNodeMaterial } from 'three/webgpu'
import { attribute, clamp, float, fract, uniform } from 'three/tsl'
import type { ShaderNodeObject } from 'three/tsl'
import type Node from 'three/src/nodes/core/Node.js'

export type ParticleShape = 'cone' | 'sphere' | 'disc'

/**
 * TSL node type — all shader nodes share this base.
 * Use TSL operations (.mul, .add, mix, triNoise3D, etc.) on context values.
 */
export type ParticleNode = ShaderNodeObject<Node>

/**
 * Context passed to each builder function.
 * All fields are TSL nodes — compose them with TSL operations to build the shader.
 *
 * t        [0,1]  — normalized phase within lifetime
 * tScaled  [0,L]  — actual time in seconds (L = lifetime)
 * bell     [0,1]  — 4t(1-t), peaks at t=0.5 — useful for size/opacity envelopes
 * aDir     vec3   — initial direction baked at construction (from emitter shape)
 * aOffset  float  — phase offset [0,1] baked at construction (staggers particles)
 * uTime           — global elapsed time uniform
 * uLifetime       — particle lifetime uniform (read-only; use setLifetime() to mutate)
 */
export interface ParticleNodeContext {
  readonly t: ParticleNode
  readonly tScaled: ParticleNode
  readonly bell: ParticleNode
  readonly aDir: ParticleNode
  readonly aOffset: ParticleNode
  readonly uTime: ReturnType<typeof uniform>
  readonly uLifetime: ReturnType<typeof uniform>
}

export interface GPUParticleSystemOptions {
  count?: number
  lifetime?: number
  shape?: ParticleShape
  spread?: number
  blending?: THREE.Blending
  depthWrite?: boolean
  sizeAttenuation?: boolean
  buildPosition: (ctx: ParticleNodeContext) => ParticleNode
  buildColor: (ctx: ParticleNodeContext) => ParticleNode
  buildSize: (ctx: ParticleNodeContext) => ParticleNode
  buildOpacity: (ctx: ParticleNodeContext) => ParticleNode
}

export class GPUParticleSystem {
  readonly points: THREE.Points
  private readonly uTime = uniform(0)
  private readonly uLifetime = uniform(1.5)
  private geometry: THREE.BufferGeometry | null = null
  private material: PointsNodeMaterial | null = null
  private isDisposed = false

  constructor(opts: GPUParticleSystemOptions) {
    this.uLifetime.value = opts.lifetime ?? 1.5

    const count = opts.count ?? 300
    this.geometry = this.buildGeometry(count, opts.spread ?? Math.PI / 4, opts.shape ?? 'cone')
    this.material = this.buildMaterial(opts)
    this.points = new THREE.Points(this.geometry, this.material)
  }

  private buildGeometry(count: number, spread: number, shape: ParticleShape): THREE.BufferGeometry {
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(count * 3), 3))

    const offsets = new Float32Array(count)
    for (let i = 0; i < count; i++) offsets[i] = Math.random()
    geo.setAttribute('aOffset', new THREE.BufferAttribute(offsets, 1))

    const dirs = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      const d = sampleDir(shape, spread)
      dirs[i * 3] = d.x
      dirs[i * 3 + 1] = d.y
      dirs[i * 3 + 2] = d.z
    }
    geo.setAttribute('aDir', new THREE.BufferAttribute(dirs, 3))
    return geo
  }

  private buildMaterial(opts: GPUParticleSystemOptions): PointsNodeMaterial {
    const aOffset = attribute('aOffset', 'float')
    const aDir = attribute('aDir', 'vec3')

    const t = fract(this.uTime.div(this.uLifetime).add(aOffset))
    const tScaled = t.mul(this.uLifetime)
    const bell = clamp(t.mul(float(4.0)).mul(float(1.0).sub(t)), float(0.0), float(1.0))

    const ctx: ParticleNodeContext = {
      t: t as ParticleNode,
      tScaled: tScaled as ParticleNode,
      bell: bell as ParticleNode,
      aDir: aDir as ParticleNode,
      aOffset: aOffset as ParticleNode,
      uTime: this.uTime,
      uLifetime: this.uLifetime,
    }

    const mat = new PointsNodeMaterial()
    mat.positionNode = opts.buildPosition(ctx)
    mat.colorNode = opts.buildColor(ctx)
    mat.sizeNode = opts.buildSize(ctx)
    mat.opacityNode = opts.buildOpacity(ctx)
    mat.transparent = true
    mat.blending = opts.blending ?? THREE.AdditiveBlending
    mat.depthWrite = opts.depthWrite ?? false
    mat.sizeAttenuation = opts.sizeAttenuation ?? false
    return mat
  }

  update(time: number): void {
    if (this.isDisposed) return
    this.uTime.value = time
  }

  setLifetime(value: number): void {
    if (this.isDisposed) return
    this.uLifetime.value = Math.max(0.1, value)
  }

  dispose(): void {
    if (this.isDisposed) return
    this.geometry?.dispose()
    this.material?.dispose()
    this.points.parent?.remove(this.points)
    this.geometry = null
    this.material = null
    this.isDisposed = true
  }
}

function sampleDir(shape: ParticleShape, spread: number): THREE.Vector3 {
  const theta = Math.random() * Math.PI * 2
  if (shape === 'sphere') {
    const phi = Math.acos(2 * Math.random() - 1)
    return new THREE.Vector3(
      Math.sin(phi) * Math.cos(theta),
      Math.cos(phi),
      Math.sin(phi) * Math.sin(theta),
    )
  }
  if (shape === 'disc') {
    return new THREE.Vector3(
      Math.cos(theta),
      Math.sin(spread * Math.random()),
      Math.sin(theta),
    ).normalize()
  }
  // cone: uniform solid angle sampling — avoids particle concentration at center
  const phi = Math.acos(1 - Math.random() * (1 - Math.cos(spread)))
  return new THREE.Vector3(
    Math.sin(phi) * Math.cos(theta),
    Math.cos(phi),
    Math.sin(phi) * Math.sin(theta),
  )
}
