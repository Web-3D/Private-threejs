import * as THREE from 'three'
import { PointsNodeMaterial } from 'three/webgpu'
import { attribute, clamp, color, float, fract, mix, triNoise3D, uniform, vec3 } from 'three/tsl'

export type SparkShape = 'cone' | 'sphere' | 'disc'

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

export class SparkSystem {
  readonly points: THREE.Points
  private geometry: THREE.BufferGeometry | null = null
  private material: PointsNodeMaterial | null = null
  private isDisposed = false

  private readonly uTime = uniform(0)
  private readonly uLifetime = uniform(1.5)
  private readonly uSpeed = uniform(4.0)
  private readonly uGravity = uniform(4.0)
  private readonly uSizeMin = uniform(2.0)
  private readonly uSizeMax = uniform(6.0)

  constructor(opts: SparkSystemOptions = {}) {
    this.uLifetime.value = opts.lifetime ?? 1.5
    this.uSpeed.value = opts.speed ?? 4.0
    this.uGravity.value = opts.gravity ?? 4.0
    this.uSizeMin.value = opts.sizeMin ?? 2.0
    this.uSizeMax.value = opts.sizeMax ?? 6.0

    const count = opts.count ?? 300
    this.geometry = this.buildGeometry(count, opts.spread ?? Math.PI / 4, opts.shape ?? 'cone')
    this.material = this.buildMaterial(opts)
    this.points = new THREE.Points(this.geometry, this.material)
  }

  private buildGeometry(count: number, spread: number, shape: SparkShape): THREE.BufferGeometry {
    const geo = new THREE.BufferGeometry()
    geo.setAttribute('position', new THREE.BufferAttribute(new Float32Array(count * 3), 3))

    const offsets = new Float32Array(count)
    for (let i = 0; i < count; i++) offsets[i] = Math.random()
    geo.setAttribute('aOffset', new THREE.BufferAttribute(offsets, 1))

    const dirs = new Float32Array(count * 3)
    for (let i = 0; i < count; i++) {
      const d = sampleDir(shape, spread)
      dirs[i * 3] = d.x; dirs[i * 3 + 1] = d.y; dirs[i * 3 + 2] = d.z
    }
    geo.setAttribute('aDir', new THREE.BufferAttribute(dirs, 3))
    return geo
  }

  private buildMaterial(opts: SparkSystemOptions): PointsNodeMaterial {
    const aOffset = attribute('aOffset', 'float')
    const aDir = attribute('aDir', 'vec3')

    const t = fract(this.uTime.div(this.uLifetime).add(aOffset))
    const tScaled = t.mul(this.uLifetime)

    const trajectory = aDir.mul(this.uSpeed).mul(tScaled)
      .add(vec3(0, -1, 0).mul(this.uGravity.mul(float(0.5)).mul(tScaled.mul(tScaled))))

    const bell = clamp(t.mul(float(4.0)).mul(float(1.0).sub(t)), float(0.0), float(1.0))

    let finalPos = trajectory
    if (opts.turbulence) {
      const noise = triNoise3D(trajectory.mul(float(2.0)), float(0.8), this.uTime)
      finalPos = trajectory.add(vec3(1, 0, 1).mul(noise.sub(float(0.5))).mul(float(0.3)))
    }

    const mat = new PointsNodeMaterial()
    mat.positionNode = finalPos
    mat.sizeNode = mix(this.uSizeMin, this.uSizeMax, bell)
    mat.colorNode = mix(color(opts.colorHot ?? 0xffee88), color(opts.colorCold ?? 0xcc2200), t)
    mat.opacityNode = bell
    mat.transparent = true
    mat.blending = THREE.AdditiveBlending
    mat.depthWrite = false
    mat.sizeAttenuation = false
    return mat
  }

  update(time: number): void {
    if (this.isDisposed) return
    this.uTime.value = time
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

function sampleDir(shape: SparkShape, spread: number): THREE.Vector3 {
  const theta = Math.random() * Math.PI * 2
  if (shape === 'sphere') {
    const phi = Math.acos(2 * Math.random() - 1)
    return new THREE.Vector3(
      Math.sin(phi) * Math.cos(theta),
      Math.cos(phi),
      Math.sin(phi) * Math.sin(theta)
    )
  }
  if (shape === 'disc') {
    return new THREE.Vector3(
      Math.cos(theta), Math.sin(spread * Math.random()), Math.sin(theta)
    ).normalize()
  }
  // cone: uniform sampling over solid angle, avoids concentration at center
  const phi = Math.acos(1 - Math.random() * (1 - Math.cos(spread)))
  return new THREE.Vector3(
    Math.sin(phi) * Math.cos(theta),
    Math.cos(phi),
    Math.sin(phi) * Math.sin(theta)
  )
}
