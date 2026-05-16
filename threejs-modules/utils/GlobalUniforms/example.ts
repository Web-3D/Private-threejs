import * as THREE from 'three'
import { WebGPURenderer, NodeMaterial } from 'three/webgpu'
import { vec3, mix, sin } from 'three/tsl'

import { uTime, uWeather, uDamage, updateTime, setWeather, setDamage } from './index'

export async function createDemo(canvas: HTMLCanvasElement): Promise<{ dispose(): void }> {
  const w = canvas.clientWidth || 300
  const h = canvas.clientHeight || 200

  const renderer = new WebGPURenderer({ canvas, antialias: true })
  renderer.setPixelRatio(1)
  renderer.setSize(w, h)
  await renderer.init()

  const scene = new THREE.Scene()
  scene.background = new THREE.Color(0x111111)

  const camera = new THREE.PerspectiveCamera(75, w / h, 0.1, 100)
  camera.position.z = 3

  // Demonstrates all 3 shared uniforms in one material:
  // uWeather  → blends blue (clear) to grey (storm)
  // uDamage   → overlays red tint
  // uTime     → pulses brightness via sin wave
  const clearColor  = vec3(0.27, 0.53, 1.0)
  const stormColor  = vec3(0.20, 0.20, 0.35)
  const damageColor = vec3(0.80, 0.10, 0.05)

  const material = new NodeMaterial()
  const blended = mix(mix(clearColor, stormColor, uWeather), damageColor, uDamage)
  material.colorNode = blended.mul(sin(uTime).mul(0.2).add(0.8))

  const geometry = new THREE.SphereGeometry(1, 32, 32)
  const mesh = new THREE.Mesh(geometry, material)
  scene.add(mesh)

  const clock = new THREE.Clock()

  renderer.setAnimationLoop(() => {
    const delta   = clock.getDelta()
    const elapsed = clock.getElapsedTime()

    updateTime(delta)
    setWeather(Math.sin(elapsed * 0.5) * 0.5 + 0.5)
    setDamage(Math.max(0, Math.sin(elapsed * 0.2)))

    mesh.rotation.y += 0.005
    renderer.render(scene, camera)
  })

  return {
    dispose() {
      renderer.setAnimationLoop(null)
      geometry.dispose()
      material.dispose()
      renderer.dispose()
    },
  }
}
