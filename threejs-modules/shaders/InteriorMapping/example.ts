import * as THREE from 'three'
import { WebGPURenderer } from 'three/webgpu'

import { InteriorMapping } from './index'

function makeRoomTexture(): THREE.CanvasTexture {
  const cvs = document.createElement('canvas')
  cvs.width = 256
  cvs.height = 256
  const ctx = cvs.getContext('2d')
  if (!ctx) throw new Error('Canvas 2D not available')
  const grad = ctx.createLinearGradient(0, 0, 256, 256)
  grad.addColorStop(0, '#1a3a5c')
  grad.addColorStop(0.4, '#2d6a9f')
  grad.addColorStop(0.7, '#c4a35a')
  grad.addColorStop(1, '#3a1a0a')
  ctx.fillStyle = grad
  ctx.fillRect(0, 0, 256, 256)
  ctx.fillStyle = 'rgba(255,255,200,0.3)'
  ctx.fillRect(30, 180, 80, 60)
  ctx.fillRect(150, 180, 80, 60)
  return new THREE.CanvasTexture(cvs)
}

export async function createDemo(canvas: HTMLCanvasElement): Promise<{ dispose(): void }> {
  const w = canvas.clientWidth || 300
  const h = canvas.clientHeight || 200

  const renderer = new WebGPURenderer({ canvas, antialias: true })
  renderer.setPixelRatio(1)
  renderer.setSize(w, h)
  await renderer.init()

  const scene = new THREE.Scene()
  scene.background = new THREE.Color(0x222222)

  const camera = new THREE.PerspectiveCamera(50, w / h, 0.1, 100)
  camera.position.set(0, 0, 4)
  camera.lookAt(0, 0, 0)

  const roomTexture = makeRoomTexture()
  const interior = new InteriorMapping({ map: roomTexture, tiling: 4, depth: 0.6 })
  const geo = new THREE.PlaneGeometry(3, 3)
  geo.computeTangents()
  const mesh = new THREE.Mesh(geo, interior.getMaterial())
  scene.add(mesh)

  let t = 0
  renderer.setAnimationLoop(() => {
    t += 0.008
    camera.position.x = Math.sin(t) * 2.5
    camera.position.y = Math.sin(t * 0.5) * 1.2
    camera.lookAt(0, 0, 0)
    renderer.render(scene, camera)
  })

  return {
    dispose() {
      renderer.setAnimationLoop(null)
      interior.dispose()
      roomTexture.dispose()
      geo.dispose()
      renderer.dispose()
    },
  }
}
