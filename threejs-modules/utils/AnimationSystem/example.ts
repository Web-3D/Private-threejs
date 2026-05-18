/**
 * VỊ TRÍ  : threejs-modules/utils/AnimationSystem/example.ts
 * VAI TRÒ : Demo visual — AnimationSystem với procedural AnimationClip (không cần glTF file)
 */

import * as THREE from 'three'
import { WebGPURenderer } from 'three/webgpu'
import { AnimationSystem } from './index'

export async function createDemo(canvas: HTMLCanvasElement): Promise<() => void> {
  const renderer = new WebGPURenderer({ canvas, antialias: true })
  await renderer.init()
  renderer.setSize(canvas.clientWidth, canvas.clientHeight)

  const scene = new THREE.Scene()
  scene.background = new THREE.Color(0x111111)

  const camera = new THREE.PerspectiveCamera(60, canvas.clientWidth / canvas.clientHeight, 0.1, 50)
  camera.position.set(0, 1.5, 4)

  const light = new THREE.DirectionalLight(0xffffff, 2)
  light.position.set(3, 5, 3)
  scene.add(light)
  scene.add(new THREE.AmbientLight(0xffffff, 0.4))

  // Mesh đơn giản để demo — dùng procedural clip (bounce + spin)
  const geo = new THREE.BoxGeometry(0.6, 0.6, 0.6)
  const mat = new THREE.MeshStandardMaterial({ color: 0x4488ff })
  const mesh = new THREE.Mesh(geo, mat)
  scene.add(mesh)

  // Tạo 2 AnimationClip procedural
  // Clip "Bounce" — di chuyển Y lên xuống
  const bounceTrack = new THREE.VectorKeyframeTrack(
    '.position[y]',
    [0, 0.5, 1],
    [0, 1.2, 0],
  )
  const bounceClip = new THREE.AnimationClip('Bounce', 1, [bounceTrack])

  // Clip "Spin" — xoay Y
  const spinTrack = new THREE.QuaternionKeyframeTrack(
    '.quaternion',
    [0, 1],
    [
      ...new THREE.Quaternion().toArray(),
      ...new THREE.Quaternion().setFromEuler(new THREE.Euler(0, Math.PI * 2, 0)).toArray(),
    ],
  )
  const spinClip = new THREE.AnimationClip('Spin', 1, [spinTrack])

  const anim = new AnimationSystem({ root: mesh, clips: [bounceClip, spinClip] })
  anim.play('Bounce')

  // Button UI — toggle clip
  let current = 'Bounce'
  const info = document.createElement('div')
  info.style.cssText =
    'position:absolute;top:8px;left:8px;color:#fff;font:14px monospace;background:#0004;padding:6px 10px;border-radius:4px;cursor:pointer'
  info.textContent = 'Click: toggle Bounce ↔ Spin'
  canvas.parentElement?.appendChild(info)

  info.addEventListener('click', () => {
    current = current === 'Bounce' ? 'Spin' : 'Bounce'
    anim.crossFade(current, 0.3)
    info.textContent = `Active: ${current} — click to toggle`
  })

  const clock = new THREE.Clock()
  let rafId: number

  function animate() {
    rafId = requestAnimationFrame(animate)
    anim.update(clock.getDelta())
    renderer.render(scene, camera)
  }
  animate()

  return () => {
    cancelAnimationFrame(rafId)
    info.remove()
    anim.dispose()
    geo.dispose()
    mat.dispose()
    renderer.dispose()
  }
}
