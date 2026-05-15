import * as THREE from 'three'
import { WebGPURenderer } from 'three/webgpu'

import { PostProcessingManager } from './index'

/**
 * Demo: scene với emissive spheres — bloom làm cho vùng sáng "glow" rõ ràng.
 * Spheres xoay để thấy bloom thay đổi theo góc ánh sáng.
 */
export async function createDemo(canvas: HTMLCanvasElement): Promise<{ dispose(): void }> {
  const w = canvas.clientWidth || 300
  const h = canvas.clientHeight || 200

  const renderer = new WebGPURenderer({ canvas, antialias: true })
  renderer.setPixelRatio(1)
  renderer.setSize(w, h)
  await renderer.init()

  const scene = new THREE.Scene()
  scene.background = new THREE.Color(0x050505)

  const camera = new THREE.PerspectiveCamera(60, w / h, 0.1, 100)
  camera.position.set(0, 1, 6)
  camera.lookAt(0, 0, 0)

  scene.add(new THREE.AmbientLight(0xffffff, 0.1))
  const dirLight = new THREE.DirectionalLight(0xffffff, 1)
  dirLight.position.set(3, 5, 4)
  scene.add(dirLight)

  // Emissive spheres — vùng sáng mạnh để thấy bloom effect
  const sphereGeo = new THREE.SphereGeometry(0.5, 16, 16)
  const emissiveColors = [0xff4444, 0x44aaff, 0xffcc00, 0x44ff88]
  const baseAngles = emissiveColors.map((_, i) => (i / emissiveColors.length) * Math.PI * 2)
  const spheres: THREE.Mesh[] = emissiveColors.map((emissive, i) => {
    const mat = new THREE.MeshStandardMaterial({
      color: 0x222222,
      emissive: new THREE.Color(emissive),
      emissiveIntensity: 2.5,
    })
    const sphere = new THREE.Mesh(sphereGeo, mat)
    sphere.position.set(Math.cos(baseAngles[i]) * 2, 0, Math.sin(baseAngles[i]) * 2)
    scene.add(sphere)
    return sphere
  })

  // PostProcessingManager — thay thế renderer.render() trực tiếp
  const pp = new PostProcessingManager({
    renderer,
    scene,
    camera,
    bloomStrength: 1.5,
    bloomRadius: 0.4,
    bloomThreshold: 0.8,
  })

  const clock = new THREE.Clock()

  renderer.setAnimationLoop(() => {
    const t = clock.getElapsedTime()
    // Orbit spheres around center
    for (let i = 0; i < spheres.length; i++) {
      const a = baseAngles[i] + t * 0.3
      spheres[i].position.set(Math.cos(a) * 2, 0, Math.sin(a) * 2)
    }
    pp.render()  // Thay thế renderer.render(scene, camera)
  })

  return {
    dispose() {
      renderer.setAnimationLoop(null)
      pp.dispose()
      sphereGeo.dispose()
      for (const sphere of spheres) {
        if (sphere.material instanceof THREE.MeshStandardMaterial) {
          sphere.material.dispose()
        }
      }
      renderer.dispose()
    },
  }
}
