/**
 * VỊ TRÍ  : threejs-modules/utils/ScrollTimeline/example.ts
 * VAI TRÒ : Demo visual — camera bay dọc theo path khi scroll trang
 */

import * as THREE from 'three'
import { WebGPURenderer } from 'three/webgpu'
import { ScrollTimeline } from './index'

export async function createDemo(canvas: HTMLCanvasElement): Promise<() => void> {
  const renderer = new WebGPURenderer({ canvas, antialias: true })
  await renderer.init()
  renderer.setSize(canvas.clientWidth, canvas.clientHeight)

  const scene = new THREE.Scene()
  scene.background = new THREE.Color(0x0a0a1a)
  scene.fog = new THREE.Fog(0x0a0a1a, 10, 40)

  const camera = new THREE.PerspectiveCamera(60, canvas.clientWidth / canvas.clientHeight, 0.1, 100)

  // Tạo một số object để nhìn khi camera bay qua
  const colors = [0xff4444, 0x44ff88, 0x4488ff, 0xff8800, 0xcc44ff]
  for (let i = 0; i < 20; i++) {
    const geo = new THREE.BoxGeometry(0.5, 0.5, 0.5)
    const mat = new THREE.MeshStandardMaterial({ color: colors[i % colors.length] })
    const mesh = new THREE.Mesh(geo, mat)
    mesh.position.set(
      (Math.random() - 0.5) * 12,
      (Math.random() - 0.5) * 6,
      (Math.random() - 0.5) * 20,
    )
    mesh.rotation.set(Math.random(), Math.random(), Math.random())
    scene.add(mesh)
  }

  const light = new THREE.DirectionalLight(0xffffff, 2)
  light.position.set(5, 10, 5)
  scene.add(light)
  scene.add(new THREE.AmbientLight(0x334466, 1))

  // Camera path — vòng cung từ trước ra sau
  const timeline = new ScrollTimeline({
    camera,
    points: [
      new THREE.Vector3(0, 2, 10),
      new THREE.Vector3(5, 3, 5),
      new THREE.Vector3(3, 1, 0),
      new THREE.Vector3(-4, 2, -5),
      new THREE.Vector3(0, 0, -10),
    ],
    lookAt: { type: 'fixed', target: new THREE.Vector3(0, 0, 0) },
    smoothing: 0.06,
  })

  // Thêm scrollable space vào parent element
  const wrapper = canvas.parentElement
  let addedSpace = false
  if (wrapper && !addedSpace) {
    wrapper.style.position = 'relative'
    const spacer = document.createElement('div')
    spacer.style.cssText = 'height:300vh;pointer-events:none'
    spacer.dataset.scrollDemoSpacer = 'true'
    wrapper.appendChild(spacer)
    addedSpace = true
  }

  // Label
  const label = document.createElement('div')
  label.style.cssText =
    'position:fixed;top:12px;left:50%;transform:translateX(-50%);color:#fff;font:13px monospace;background:#0006;padding:5px 12px;border-radius:4px;pointer-events:none'
  label.textContent = 'Scroll để di chuyển camera'
  document.body.appendChild(label)

  let rafId: number
  function animate() {
    rafId = requestAnimationFrame(animate)
    timeline.update()
    const p = Math.round(timeline.getProgress() * 100)
    label.textContent = `Progress: ${p}% — scroll để di chuyển camera`
    renderer.render(scene, camera)
  }
  animate()

  return () => {
    cancelAnimationFrame(rafId)
    timeline.dispose()
    label.remove()
    // Xóa spacer
    wrapper?.querySelector('[data-scroll-demo-spacer]')?.remove()
    renderer.dispose()
  }
}
