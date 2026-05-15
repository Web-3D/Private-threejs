import * as THREE from 'three'
import { WebGPURenderer } from 'three/webgpu'
import { color, float, mix, triNoise3D, uniform, vec3 } from 'three/tsl'

import { GPUParticleSystem } from './index'

export async function createDemo(canvas: HTMLCanvasElement): Promise<{ dispose(): void }> {
  const w = canvas.clientWidth || 300
  const h = canvas.clientHeight || 200

  const renderer = new WebGPURenderer({ canvas, antialias: true })
  renderer.setPixelRatio(1)
  renderer.setSize(w, h)
  await renderer.init()

  const scene = new THREE.Scene()
  scene.background = new THREE.Color(0x080808)

  const camera = new THREE.PerspectiveCamera(60, w / h, 0.1, 100)
  camera.position.set(0, 3, 10)
  camera.lookAt(0, 2, 0)

  const uDrift = uniform(0.25)

  const embers = new GPUParticleSystem({
    count: 600,
    lifetime: 2.5,
    shape: 'disc',
    spread: Math.PI / 3,
    buildPosition: ({ aDir, tScaled, uTime }) => {
      const rise = vec3(0, float(0.8), 0).mul(tScaled)
      const drift = aDir.mul(uDrift).mul(tScaled)
      const noiseInput = drift.add(rise).mul(float(1.2))
      const noise = triNoise3D(noiseInput, float(0.5), uTime)
      return rise.add(drift).add(vec3(1, 0, 1).mul(noise.sub(float(0.5))).mul(float(0.5)))
    },
    buildColor: ({ t }) => mix(color(0xffcc44), color(0xff2200), t),
    buildSize: ({ bell }) => mix(float(2.0), float(7.0), bell),
    buildOpacity: ({ bell }) => bell.mul(float(0.9)),
  })
  scene.add(embers.points)

  const clock = new THREE.Clock()

  renderer.setAnimationLoop(() => {
    embers.update(clock.getElapsedTime())
    renderer.render(scene, camera)
  })

  return {
    dispose() {
      renderer.setAnimationLoop(null)
      embers.dispose()
      renderer.dispose()
    },
  }
}
