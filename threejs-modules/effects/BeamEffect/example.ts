import * as THREE from 'three'
import { BaseWorld } from '../../utils/BaseWorld'
import { BeamEffect } from './index'

const PIVOT_A = new THREE.Vector3(-2, 1, 0)
const PIVOT_B = new THREE.Vector3(2, 1, 0)

class BeamDemo extends BaseWorld {
  private readonly beams: BeamEffect[] = []
  private readonly markerGeo = new THREE.SphereGeometry(0.08, 8, 8)
  private readonly markerMat = new THREE.MeshBasicMaterial({ color: 0xffffff })
  // Reusable vectors
  private readonly _orbitA = new THREE.Vector3()
  private readonly _orbitB = new THREE.Vector3()

  protected async onInit(): Promise<void> {
    this.scene.background = new THREE.Color(0x050510)
    this.camera.position.set(0, 3, 10)
    this.camera.lookAt(0, 1, 0)

    // 3 beams: pivot→orbitA, pivot→orbitB, orbitA→orbitB
    const colors: THREE.ColorRepresentation[] = [0x00ffff, 0xff4400, 0x44ff00]
    for (const c of colors) {
      const b = new BeamEffect({ color: c, radius: 0.025, additive: true })
      this.scene.add(b.root)
      this.beams.push(b)
    }

    // Pivot markers
    for (const p of [PIVOT_A, PIVOT_B]) {
      const m = new THREE.Mesh(this.markerGeo, this.markerMat)
      m.position.copy(p)
      this.scene.add(m)
    }
  }

  protected onUpdate(time: number, _dt: number): void {
    // Orbiter A circles PIVOT_A
    this._orbitA.set(
      PIVOT_A.x + Math.cos(time) * 1.5,
      PIVOT_A.y + Math.sin(time * 1.3) * 0.8,
      Math.sin(time) * 1.5,
    )
    // Orbiter B circles PIVOT_B in opposite direction
    this._orbitB.set(
      PIVOT_B.x + Math.cos(-time * 0.7) * 1.5,
      PIVOT_B.y + Math.sin(time * 0.9) * 0.8,
      Math.sin(-time * 0.7) * 1.5,
    )

    this.beams[0].update(PIVOT_A, this._orbitA)
    this.beams[1].update(PIVOT_B, this._orbitB)
    this.beams[2].update(this._orbitA, this._orbitB)
  }

  protected onDispose(): void {
    this.beams.forEach(b => b.dispose())
    this.markerGeo.dispose()
    this.markerMat.dispose()
  }
}

export async function createDemo(canvas: HTMLCanvasElement): Promise<{ dispose(): void }> {
  const demo = new BeamDemo(canvas)
  await demo.init()
  return { dispose: () => demo.dispose() }
}
