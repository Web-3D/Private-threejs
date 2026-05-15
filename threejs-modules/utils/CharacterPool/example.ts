import * as THREE from 'three'
import { WebGPURenderer } from 'three/webgpu'

import { CharacterPool } from './index'

/**
 * Demo: 8-slot pool của colored cubes.
 * Mỗi 0.8s acquire một slot → đặt vào scene ngẫu nhiên.
 * Sau 2.5s mỗi slot được release → cube biến mất, slot trở lại pool.
 * Minh họa acquire/release cycle và warnThreshold khi gần đầy.
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
  camera.position.set(0, 2, 8)
  camera.lookAt(0, 0, 0)

  scene.add(new THREE.AmbientLight(0xffffff, 0.5))
  const dirLight = new THREE.DirectionalLight(0xffffff, 1.5)
  dirLight.position.set(3, 5, 4)
  scene.add(dirLight)

  // Shared geometry — tất cả slots dùng chung, không duplicate GPU resource
  const sharedGeo = new THREE.BoxGeometry(0.6, 0.6, 0.6)

  // Pool: 8 slots, mỗi slot có màu riêng — dùng counter để tránh circular ref
  const colors = [0xff4444, 0x44ff44, 0x4488ff, 0xffaa00, 0xff44ff, 0x44ffff, 0xffff44, 0xaaaaaa]
  let slotIndex = 0
  const pool = new CharacterPool<THREE.Mesh>({
    factory: () => {
      const mat = new THREE.MeshStandardMaterial({ color: colors[slotIndex % colors.length] ?? 0xffffff })
      slotIndex++
      return new THREE.Mesh(sharedGeo, mat)
    },
    poolSize: 8,
    warnThreshold: 0.75,  // warn tại 6/8 active
    disposer: (mesh) => {
      if (Array.isArray(mesh.material)) {
        mesh.material.forEach(m => m.dispose())
      } else {
        mesh.material.dispose()
      }
    },
  })

  // Lịch release: [slot, releaseAt timestamp]
  const releaseQueue: Array<[THREE.Mesh, number]> = []

  const clock = new THREE.Clock()
  let lastAcquireTime = 0
  const ACQUIRE_INTERVAL = 0.8  // giây
  const ACTIVE_DURATION = 2.5   // giây mỗi slot active

  renderer.setAnimationLoop(() => {
    const t = clock.getElapsedTime()

    // Release slots đã hết ACTIVE_DURATION
    for (let i = releaseQueue.length - 1; i >= 0; i--) {
      const [slot, releaseAt] = releaseQueue[i]
      if (t >= releaseAt) {
        scene.remove(slot)
        pool.release(slot)
        releaseQueue.splice(i, 1)
      }
    }

    // Acquire slot mới nếu pool còn free và đủ interval
    if (t - lastAcquireTime >= ACQUIRE_INTERVAL) {
      const slot = pool.acquire()
      if (slot) {
        slot.position.set(
          (Math.random() - 0.5) * 6,
          Math.random() * 2,
          (Math.random() - 0.5) * 4,
        )
        slot.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, 0)
        scene.add(slot)
        releaseQueue.push([slot, t + ACTIVE_DURATION])
      }
      lastAcquireTime = t
    }

    renderer.render(scene, camera)
  })

  return {
    dispose() {
      renderer.setAnimationLoop(null)
      pool.dispose()
      sharedGeo.dispose()
      renderer.dispose()
    },
  }
}
