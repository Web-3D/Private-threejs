// threejs-modules/shaders/fragment/Weathering/example.ts
// Standalone demo — chạy được mà không cần project setup

import * as THREE from 'three'
import { Weathering } from './index'

// ── Setup ─────────────────────────────────────────────────────────────────────

const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(800, 600)
document.body.appendChild(renderer.domElement)

const scene  = new THREE.Scene()
const camera = new THREE.PerspectiveCamera(60, 800 / 600, 0.1, 100)
camera.position.set(0, 2, 5)
camera.lookAt(0, 1.5, 0)

// ── Demo objects ──────────────────────────────────────────────────────────────

// Fresh wall — light weathering
const lightWear = new Weathering({
  scale: 1.2,
  baseColor: new THREE.Color(0.85, 0.80, 0.72),
  mossAmt:  0.30,
  dirtAmt:  0.25,
  rustAmt:  0.10,
  stainAmt: 0.20,
})

const wall1Geo = new THREE.BoxGeometry(2.5, 3.0, 0.1)
const wall1    = new THREE.Mesh(wall1Geo, lightWear.getMaterial())
wall1.position.set(-1.5, 1.5, 0)
scene.add(wall1)

// Aged wall — heavy weathering
const heavyWear = new Weathering({
  scale: 0.9,
  baseColor: new THREE.Color(0.68, 0.62, 0.52),
  mossAmt:  0.75,
  dirtAmt:  0.65,
  rustAmt:  0.55,
  stainAmt: 0.50,
})

const wall2Geo = new THREE.BoxGeometry(2.5, 3.0, 0.1)
const wall2    = new THREE.Mesh(wall2Geo, heavyWear.getMaterial())
wall2.position.set(1.5, 1.5, 0)
scene.add(wall2)

// Light
const sun = new THREE.DirectionalLight(0xfff0e0, 1.5)
sun.position.set(2, 5, 4)
scene.add(sun)
scene.add(new THREE.AmbientLight(0xffffff, 0.5))

// ── Animation ─────────────────────────────────────────────────────────────────

function animate() {
  requestAnimationFrame(animate)
  renderer.render(scene, camera)
}
animate()

// ── Cleanup ───────────────────────────────────────────────────────────────────

// lightWear.dispose()
// heavyWear.dispose()
// wall1Geo.dispose()
// wall2Geo.dispose()
