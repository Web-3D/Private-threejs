import * as THREE from 'three'

interface ComponentNameOptions {
  position?: THREE.Vector3
}

export class ComponentName {
  public mesh: THREE.Group
  private geometry: THREE.BufferGeometry | null = null
  private material: THREE.Material | null = null
  private isDisposed = false

  constructor(options: ComponentNameOptions = {}) {
    this.mesh = new THREE.Group()
    if (options.position) this.mesh.position.copy(options.position)
    this.build()
  }

  private build(): void {
    this.geometry = new THREE.BoxGeometry(1, 1, 1)
    this.material = new THREE.MeshStandardMaterial()
    const inner = new THREE.Mesh(this.geometry, this.material)
    this.mesh.add(inner)
  }

  update(_time: number): void {
    if (this.isDisposed) return
    // per-frame logic here
  }

  dispose(): void {
    if (this.isDisposed) return
    this.geometry?.dispose()
    this.material?.dispose()
    this.mesh.parent?.remove(this.mesh)
    this.geometry = null
    this.material = null
    this.isDisposed = true
  }
}
