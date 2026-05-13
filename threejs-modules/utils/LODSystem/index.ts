/**
 * VỊ TRÍ  : threejs-modules/utils/LODSystem/index.ts
 * VAI TRÒ : Wrap THREE.LOD với typed interface — quản lý swap mesh theo khoảng cách camera
 * DÙNG KHI: Scene nhiều object, cần giảm triangle count khi camera xa
 */

import { LOD } from 'three'
import type * as THREE from 'three'

export interface LODLevel {
  mesh: THREE.Mesh
  distance: number
  hysteresis?: number
}

export interface LODSystemOptions {
  levels: LODLevel[]
  autoUpdate?: boolean
}

export class LODSystem {
  private lod: LOD | null = null
  private readonly levels: LODLevel[]
  private isDisposed = false

  constructor(opts: LODSystemOptions) {
    this.levels = opts.levels

    const lod = new LOD()
    lod.autoUpdate = opts.autoUpdate ?? true

    for (const level of opts.levels) {
      lod.addLevel(level.mesh, level.distance, level.hysteresis ?? 0)
    }

    this.lod = lod
  }

  getLOD(): LOD {
    if (!this.lod) throw new Error('LODSystem: already disposed')
    return this.lod
  }

  /** Gọi thủ công mỗi frame chỉ khi autoUpdate = false */
  update(camera: THREE.Camera): void {
    if (this.isDisposed || !this.lod) return
    this.lod.update(camera)
  }

  /** Index của level đang active: 0 = gần nhất (detail cao), tăng dần theo khoảng cách */
  getCurrentLevel(): number {
    return this.lod?.getCurrentLevel() ?? 0
  }

  dispose(): void {
    if (this.isDisposed) return
    this.lod?.parent?.remove(this.lod)
    for (const level of this.levels) {
      level.mesh.geometry.dispose()
      if (Array.isArray(level.mesh.material)) {
        level.mesh.material.forEach(m => m.dispose())
      } else {
        level.mesh.material.dispose()
      }
    }
    this.lod = null
    this.isDisposed = true
  }
}
