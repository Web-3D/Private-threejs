import * as THREE from 'three'

interface ShaderNameOptions {
  color?: THREE.ColorRepresentation
  speed?: number
}

export class ShaderName {
  private material: THREE.MeshStandardMaterial | null = null
  private isDisposed = false

  constructor(options: ShaderNameOptions = {}) {
    this.material = new THREE.MeshStandardMaterial({
      color: options.color ?? 0xffffff,
    })
    this.material.userData.speed = options.speed ?? 1.0
  }

  update(_time: number): void {
    if (this.isDisposed || !this.material) return
    // uniform updates here — use _time for animation
  }

  get(): THREE.Material {
    if (!this.material) throw new Error('ShaderName: already disposed')
    return this.material
  }

  dispose(): void {
    if (this.isDisposed) return
    this.material?.dispose()
    this.material = null
    this.isDisposed = true
  }
}
