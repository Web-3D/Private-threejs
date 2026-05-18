import * as THREE from 'three'
import { BaseWorld } from '../../utils/core/BaseWorld'
import { BillboardSprite } from './index'

function makeGlowTexture(size = 128): THREE.CanvasTexture {
  const canvas = document.createElement('canvas')
  canvas.width = canvas.height = size
  const ctx = canvas.getContext('2d')
  if (!ctx) throw new Error('2D context unavailable')
  const half = size / 2
  const grad = ctx.createRadialGradient(half, half, 0, half, half, half)
  grad.addColorStop(0, 'rgba(255,255,255,1)')
  grad.addColorStop(0.4, 'rgba(255,255,255,0.5)')
  grad.addColorStop(1, 'rgba(255,255,255,0)')
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, size, size)
  return new THREE.CanvasTexture(canvas)
}

const COLORS: THREE.ColorRepresentation[] = [0xff4400, 0x00aaff, 0x00ff88, 0xffcc00, 0xff00ff]
const POSITIONS: [number, number, number][] = [[-2, 1, 0], [2, 1, 0], [0, 2.5, 0], [-1, 0.2, 0], [1, 0.2, 0]]

class BillboardDemo extends BaseWorld {
  private glowTex: THREE.CanvasTexture | null = null
  private readonly sprites: BillboardSprite[] = []

  protected async onInit(): Promise<void> {
    this.scene.background = new THREE.Color(0x050510)
    this.camera.position.set(0, 1.5, 8)
    this.camera.lookAt(0, 1, 0)

    this.glowTex = makeGlowTexture()

    for (let i = 0; i < POSITIONS.length; i++) {
      const sprite = new BillboardSprite({
        map: this.glowTex,
        size: 0.9,
        color: COLORS[i],
        additive: true,
      })
      sprite.root.position.set(...POSITIONS[i])
      this.scene.add(sprite.root)
      this.sprites.push(sprite)
    }
  }

  protected onUpdate(time: number, _dt: number): void {
    // Camera orbits — sprites update SAU khi camera di chuyển
    this.camera.position.x = Math.sin(time * 0.25) * 8
    this.camera.position.z = Math.cos(time * 0.25) * 8
    this.camera.lookAt(0, 1, 0)
    for (const s of this.sprites) s.update(this.camera)
  }

  protected onDispose(): void {
    this.sprites.forEach(s => s.dispose())
    this.glowTex?.dispose()
  }
}

export async function createDemo(canvas: HTMLCanvasElement): Promise<{ dispose(): void }> {
  const demo = new BillboardDemo(canvas)
  await demo.init()
  return { dispose: () => demo.dispose() }
}
