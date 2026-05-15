import * as THREE from 'three'
import { WebGPURenderer } from 'three/webgpu'

import { VATShader } from './index'

/**
 * Demo: BoxGeometry với 32 frame "breathing" — vertices scale in/out theo sine wave.
 * Minh họa VATShader nhận pre-baked DataTexture và advance frame qua update().
 */
export async function createDemo(canvas: HTMLCanvasElement): Promise<{ dispose(): void }> {
  const w = canvas.clientWidth || 300
  const h = canvas.clientHeight || 200

  const renderer = new WebGPURenderer({ canvas, antialias: true })
  renderer.setPixelRatio(1)
  renderer.setSize(w, h)
  await renderer.init()

  const scene = new THREE.Scene()
  scene.background = new THREE.Color(0x111111)

  const camera = new THREE.PerspectiveCamera(60, w / h, 0.1, 100)
  camera.position.set(0, 0, 3)
  scene.add(new THREE.AmbientLight(0xffffff, 0.6))
  const dirLight = new THREE.DirectionalLight(0xffffff, 1.2)
  dirLight.position.set(2, 3, 4)
  scene.add(dirLight)

  // --- Bake VAT texture ---
  const geometry = new THREE.BoxGeometry(1, 1, 1)
  const positions = geometry.attributes.position
  const vertCount = positions.count  // 24 cho BoxGeometry(1,1,1)
  const frameCount = 32
  const frameRate = 8 // 8 FPS để thấy rõ từng frame

  // Layout: width = vertCount, height = frameCount
  // Pixel (v, f) = vertex v tại frame f
  // Array index: (f * vertCount + v) * 4
  const data = new Float32Array(vertCount * frameCount * 4)

  for (let f = 0; f < frameCount; f++) {
    const scale = 0.4 + 0.6 * Math.abs(Math.sin((f / frameCount) * Math.PI))
    for (let v = 0; v < vertCount; v++) {
      const idx = (f * vertCount + v) * 4
      data[idx + 0] = positions.getX(v) * scale
      data[idx + 1] = positions.getY(v) * scale
      data[idx + 2] = positions.getZ(v) * scale
      data[idx + 3] = 1.0
    }
  }

  const posTexture = new THREE.DataTexture(
    data,
    vertCount,   // width  = vertex axis
    frameCount,  // height = frame axis
    THREE.RGBAFormat,
    THREE.FloatType,
  )
  // NearestFilter: không interpolate giữa vertex hoặc frame
  posTexture.minFilter = THREE.NearestFilter
  posTexture.magFilter = THREE.NearestFilter
  posTexture.needsUpdate = true

  const vat = new VATShader({ positionTexture: posTexture, frameCount, frameRate })
  const mesh = new THREE.Mesh(geometry, vat.getMaterial())
  scene.add(mesh)

  const clock = new THREE.Clock()

  renderer.setAnimationLoop(() => {
    const t = clock.getElapsedTime()
    vat.update(t)
    mesh.rotation.y = t * 0.4
    renderer.render(scene, camera)
  })

  return {
    dispose() {
      renderer.setAnimationLoop(null)
      vat.dispose()
      posTexture.dispose()
      geometry.dispose()
      renderer.dispose()
    },
  }
}
