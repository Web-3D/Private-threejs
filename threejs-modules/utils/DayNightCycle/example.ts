import * as THREE from 'three'
import { WebGPURenderer } from 'three/webgpu'

import { DayNightCycle } from './index'

/**
 * Demo: thành phố đơn giản (3 buildings + ground) chạy qua 1 chu kỳ ngày-đêm.
 * speed: 0.1 → ~10 giây/chu kỳ để dễ quan sát đổi màu ánh sáng.
 */
export async function createDemo(canvas: HTMLCanvasElement): Promise<{ dispose(): void }> {
  const w = canvas.clientWidth || 300
  const h = canvas.clientHeight || 200

  const renderer = new WebGPURenderer({ canvas, antialias: true })
  renderer.setPixelRatio(1)
  renderer.setSize(w, h)
  await renderer.init()

  const scene = new THREE.Scene()
  scene.background = new THREE.Color(0x050510)

  const camera = new THREE.PerspectiveCamera(60, w / h, 0.1, 100)
  camera.position.set(0, 2.5, 8)
  camera.lookAt(0, 0.5, 0)

  // Lights — được DayNightCycle điều khiển
  const sunLight = new THREE.DirectionalLight(0xffffff, 0)
  scene.add(sunLight)

  const ambientLight = new THREE.AmbientLight(0x050510, 0.2)
  scene.add(ambientLight)

  // Ground
  const groundGeo = new THREE.PlaneGeometry(12, 8)
  groundGeo.rotateX(-Math.PI / 2)
  const groundMat = new THREE.MeshStandardMaterial({ color: 0x2a4020 })
  scene.add(new THREE.Mesh(groundGeo, groundMat))

  // Buildings — dùng chung material
  const buildingMat = new THREE.MeshStandardMaterial({ color: 0x8a8a9a })
  const buildingGeo = new THREE.BoxGeometry(1, 2, 1)
  const buildingConfigs: [number, number, number, number][] = [
    [-2.5, 1, -2, 1.2],
    [0, 1.5, -3, 1],
    [2.5, 1, -1.5, 0.9],
  ]
  for (const [x, y, z, sy] of buildingConfigs) {
    const b = new THREE.Mesh(buildingGeo, buildingMat)
    b.position.set(x, y, z)
    b.scale.y = sy
    scene.add(b)
  }

  // DayNightCycle — bắt đầu ở bình minh (0.2), 10s mỗi chu kỳ
  const dayNight = new DayNightCycle({
    sunLight,
    ambientLight,
    speed: 0.1,
    startTime: 0.2,
  })

  const clock = new THREE.Clock()

  renderer.setAnimationLoop(() => {
    dayNight.update(clock.getDelta())
    renderer.render(scene, camera)
  })

  return {
    dispose() {
      renderer.setAnimationLoop(null)
      dayNight.dispose()
      groundGeo.dispose()
      groundMat.dispose()
      buildingGeo.dispose()
      buildingMat.dispose()
      renderer.dispose()
    },
  }
}
