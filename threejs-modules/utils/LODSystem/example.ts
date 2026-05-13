/**
 * VỊ TRÍ   : threejs-modules/utils/LODSystem/example.ts
 * VAI TRÒ  : Demo LOD switching — camera tự di chuyển để thấy mesh swap theo khoảng cách
 * CÁCH DÙNG: Chạy độc lập trong browser
 */

import * as THREE from 'three'
import { WebGPURenderer } from 'three/webgpu'
import { LODSystem } from './index'

function createSphere(detail: number): THREE.Mesh {
  return new THREE.Mesh(
    new THREE.IcosahedronGeometry(1, detail),
    new THREE.MeshNormalMaterial({ wireframe: true })
  )
}

async function init(): Promise<void> {
  const renderer = new WebGPURenderer({ antialias: true })
  await renderer.init()
  renderer.setSize(800, 600)
  renderer.setPixelRatio(window.devicePixelRatio)
  document.body.appendChild(renderer.domElement)

  const scene = new THREE.Scene()
  scene.background = new THREE.Color(0x111111)

  const camera = new THREE.PerspectiveCamera(60, 800 / 600, 0.1, 200)
  camera.position.set(0, 2, 5)

  // LODSystem: detail 4 → 2 → 0 theo khoảng cách
  const lodSystem = new LODSystem({
    levels: [
      { mesh: createSphere(4), distance: 0 },   // gần: ~960 tris
      { mesh: createSphere(2), distance: 8 },   // mid: ~80 tris
      { mesh: createSphere(0), distance: 20 },  // xa: 20 tris
    ],
  })

  scene.add(lodSystem.getLOD())
  scene.add(new THREE.GridHelper(40, 20, 0x333333, 0x222222))

  // HUD
  const hud = document.createElement('div')
  Object.assign(hud.style, {
    position: 'fixed', top: '12px', left: '12px',
    color: '#fff', fontFamily: 'monospace', fontSize: '14px',
    background: 'rgba(0,0,0,0.5)', padding: '8px 12px', borderRadius: '4px',
  })
  document.body.appendChild(hud)

  let t = 0
  function animate(): void {
    requestAnimationFrame(animate)
    t += 0.005

    // Camera di chuyển từ gần → xa → gần
    const z = 3 + Math.abs(Math.sin(t)) * 35
    camera.position.z = z

    const level = lodSystem.getCurrentLevel()
    const labels = ['HIGH (detail 4)', 'MID (detail 2)', 'LOW (detail 0)']
    hud.textContent = `Dist: ${z.toFixed(1)} | LOD: ${labels[level] ?? level}`

    renderer.render(scene, camera)
  }
  animate()

  window.addEventListener('beforeunload', () => {
    lodSystem.dispose()
    renderer.dispose()
    hud.remove()
  })
}

init().catch(console.error)
