// threejs-modules/shaders/fragment/WoodPlank/example.ts
// Standalone demo — chạy được mà không cần project setup

import * as THREE from 'three'
import { WoodPlank } from './index'

// ── Setup ─────────────────────────────────────────────────────────────────────

const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(800, 600)
document.body.appendChild(renderer.domElement)

const scene  = new THREE.Scene()
const camera = new THREE.PerspectiveCamera(60, 800 / 600, 0.1, 100)
camera.position.set(0, 1.5, 3)
camera.lookAt(0, 0, 0)

// ── Demo objects ──────────────────────────────────────────────────────────────

// Wooden plank wall — box
const woodFloor = new WoodPlank({
  scale: 1.8,
  plankH: 0.12,
  seamFrac: 0.06,
  grainAmp: 0.25,
})

const boxGeo  = new THREE.BoxGeometry(2.4, 0.05, 1.6)
const floor   = new THREE.Mesh(boxGeo, woodFloor.getMaterial())
floor.position.y = -0.025
scene.add(floor)

// Vertical wall panel
const woodWall = new WoodPlank({
  scale: 1.5,
  plankH: 0.16,
  grainAmp: 0.20,
  woodColor: new THREE.Color(0.60, 0.40, 0.22),  // older, darker wood
  darkColor: new THREE.Color(0.28, 0.16, 0.08),
})

const wallGeo = new THREE.BoxGeometry(2.4, 1.8, 0.05)
const wall    = new THREE.Mesh(wallGeo, woodWall.getMaterial())
wall.position.set(0, 0.9, -0.8)
scene.add(wall)

// Light
const sun = new THREE.DirectionalLight(0xffffff, 1.5)
sun.position.set(3, 5, 2)
scene.add(sun)
scene.add(new THREE.AmbientLight(0xffffff, 0.4))

// ── Animation ─────────────────────────────────────────────────────────────────

function animate() {
  requestAnimationFrame(animate)
  renderer.render(scene, camera)
}
animate()

// ── Cleanup ───────────────────────────────────────────────────────────────────

// Call on page unload or scene teardown:
// woodFloor.dispose()
// woodWall.dispose()
// boxGeo.dispose()
// wallGeo.dispose()
