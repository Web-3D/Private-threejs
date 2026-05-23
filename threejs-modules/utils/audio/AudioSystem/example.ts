/**
 * VỊ TRÍ   — threejs-modules/utils/audio/AudioSystem/example.ts
 * VAI TRÒ  — Gallery demo: 3 quả cầu nảy ở 3 vị trí x = -3, 0, +3
 *            Khi chạm đất → phát positional sound với pitch khác nhau
 *            Minh họa: âm thanh từ trái/phải nghe pan khác nhau
 */

import * as THREE from 'three'
import { AudioSystem } from './index'

export async function createDemo(canvas: HTMLCanvasElement): Promise<{ dispose(): void }> {
  // --- Renderer & Scene ---
  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true })
  renderer.setSize(canvas.clientWidth, canvas.clientHeight)
  renderer.shadowMap.enabled = true

  const scene = new THREE.Scene()
  scene.background = new THREE.Color(0x1a1a2e)

  const camera = new THREE.PerspectiveCamera(60, canvas.clientWidth / canvas.clientHeight, 0.1, 200)
  camera.position.set(0, 4, 10)
  camera.lookAt(0, 1, 0)

  // --- Lighting ---
  scene.add(new THREE.AmbientLight(0x334466, 2))
  const sun = new THREE.DirectionalLight(0xffffff, 3)
  sun.position.set(5, 10, 5)
  sun.castShadow = true
  scene.add(sun)

  // --- Floor ---
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(20, 20),
    new THREE.MeshStandardMaterial({ color: 0x223344, roughness: 0.9 }),
  )
  floor.rotation.x = -Math.PI / 2
  floor.receiveShadow = true
  scene.add(floor)

  // --- Audio System ---
  const audio = new AudioSystem({ refDistance: 2, maxDistance: 20 })
  camera.add(audio.getListener())  // listener = camera position
  scene.add(audio.getRoot())

  // Tạo synthetic tones thay vì load file — demo chạy không cần asset
  const ctx = audio.getListener().context
  audio.addBuffer('thud', _makeTone(ctx, 80, 0.25))   // trái — thấp
  audio.addBuffer('ping', _makeTone(ctx, 400, 0.30))  // giữa — trung
  audio.addBuffer('ding', _makeTone(ctx, 880, 0.20))  // phải — cao

  // --- Spheres: 3 quả cầu tại x = -3, 0, +3 ---
  type SphereData = {
    mesh: THREE.Mesh
    soundName: string
    speed: number          // tốc độ nảy (rad/s)
    phase: number          // lệch pha ban đầu
    cooldown: number       // thời gian chờ giữa 2 lần phát âm (ms)
    lastPlayTime: number
  }

  const sphereConfigs: SphereData[] = [
    { mesh: _makeSphere(0xff4455), soundName: 'thud', speed: 2.1, phase: 0,          cooldown: 800, lastPlayTime: 0 },
    { mesh: _makeSphere(0x44ff88), soundName: 'ping', speed: 1.7, phase: Math.PI / 3, cooldown: 800, lastPlayTime: 0 },
    { mesh: _makeSphere(0x4488ff), soundName: 'ding', speed: 2.5, phase: Math.PI,     cooldown: 800, lastPlayTime: 0 },
  ]
  const xPositions = [-3, 0, 3]

  sphereConfigs.forEach((s, i) => {
    s.mesh.position.set(xPositions[i], 1, 0)
    scene.add(s.mesh)
  })

  // --- Click-to-enable audio overlay ---
  const hint = _makeHint()
  canvas.parentElement?.appendChild(hint)

  let audioEnabled = false
  canvas.addEventListener('pointerdown', async () => {
    if (!audioEnabled) {
      await audio.resume()
      audioEnabled = true
      hint.style.display = 'none'
    }
  }, { once: false })

  // --- Animation loop ---
  const clock = new THREE.Clock()
  let animId = 0

  function onUpdate() {
    animId = requestAnimationFrame(onUpdate)
    const elapsed = clock.getElapsedTime() * 1000  // ms
    const t = elapsed / 1000  // seconds

    sphereConfigs.forEach((s, i) => {
      // y = bounce theo sine: từ 0.5 tới 2.5 (không âm nhờ abs)
      const raw = Math.sin(s.speed * t + s.phase)
      const y = 0.3 + 2.2 * (raw * raw)  // luôn dương, chậm ở đỉnh, nhanh ở đáy
      s.mesh.position.y = y

      // Trigger sound khi sphere ở gần đất (y < 0.55) và đã hết cooldown
      if (y < 0.55 && audioEnabled && elapsed - s.lastPlayTime > s.cooldown) {
        audio.play(s.soundName, { x: xPositions[i], y: 0, z: 0 })
        s.lastPlayTime = elapsed
      }
    })

    renderer.render(scene, camera)
  }
  onUpdate()

  // --- Resize ---
  const resizeObs = new ResizeObserver(() => {
    renderer.setSize(canvas.clientWidth, canvas.clientHeight)
    camera.aspect = canvas.clientWidth / canvas.clientHeight
    camera.updateProjectionMatrix()
  })
  resizeObs.observe(canvas)

  return {
    dispose() {
      cancelAnimationFrame(animId)
      resizeObs.disconnect()
      hint.remove()
      audio.dispose()
      sphereConfigs.forEach(s => {
        s.mesh.geometry.dispose()
        ;(s.mesh.material as THREE.Material).dispose()
      })
      floor.geometry.dispose()
      ;(floor.material as THREE.Material).dispose()
      renderer.dispose()
    },
  }
}

// --- Helpers ---

function _makeSphere(color: number): THREE.Mesh {
  const mesh = new THREE.Mesh(
    new THREE.SphereGeometry(0.4, 20, 16),
    new THREE.MeshStandardMaterial({ color, roughness: 0.3, metalness: 0.5 }),
  )
  mesh.castShadow = true
  return mesh
}

/** Tạo AudioBuffer với sine wave decay — không cần load file */
function _makeTone(ctx: AudioContext, freq: number, duration: number): AudioBuffer {
  const sr = ctx.sampleRate
  const len = Math.floor(sr * duration)
  const buf = ctx.createBuffer(1, len, sr)
  const data = buf.getChannelData(0)
  for (let i = 0; i < len; i++) {
    const t = i / sr
    // Sine tone với exponential decay envelope
    data[i] = Math.sin(2 * Math.PI * freq * t) * Math.exp(-t * 10) * 0.6
  }
  return buf
}

function _makeHint(): HTMLDivElement {
  const el = document.createElement('div')
  el.textContent = '▶ Click để bật audio'
  el.style.cssText = `
    position: absolute;
    bottom: 12px;
    left: 50%;
    transform: translateX(-50%);
    background: rgba(0,0,0,0.6);
    color: #aaf;
    font: 13px/1.4 sans-serif;
    padding: 5px 12px;
    border-radius: 4px;
    pointer-events: none;
  `
  return el
}
