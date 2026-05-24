// threejs-modules/shaders/fragment/MetalPanel/example.ts
// Standalone demo — chạy được mà không cần project setup

import * as THREE from 'three'
import { MetalPanel } from './index'

// ── Setup ─────────────────────────────────────────────────────────────────────

const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(800, 600)
document.body.appendChild(renderer.domElement)

const scene  = new THREE.Scene()
const camera = new THREE.PerspectiveCamera(60, 800 / 600, 0.1, 100)
camera.position.set(0, 2, 4)
camera.lookAt(0, 1, 0)

// ── Demo objects ──────────────────────────────────────────────────────────────

// Warehouse wall — corrugated metal siding
const metalSiding = new MetalPanel({
  scale: 1.0,
  ridgeH: 0.07,
  ridgesPerPanel: 10,
  variation: 0.07,
})

const wallGeo = new THREE.BoxGeometry(4.0, 3.0, 0.05)
const wall    = new THREE.Mesh(wallGeo, metalSiding.getMaterial())
wall.position.set(0, 1.5, 0)
scene.add(wall)

// Roof sheet — corrugated metal roofing
const metalRoof = new MetalPanel({
  scale: 1.2,
  ridgeH: 0.05,
  ridgesPerPanel: 12,
  metalColor: new THREE.Color(0.62, 0.58, 0.52),  // aged zinc
  seamColor: new THREE.Color(0.25, 0.22, 0.18),
})

const roofGeo = new THREE.BoxGeometry(4.5, 0.04, 3.0)
const roof    = new THREE.Mesh(roofGeo, metalRoof.getMaterial())
roof.position.set(0, 3.1, -0.5)
roof.rotation.x = -0.15
scene.add(roof)

// Light
const sun = new THREE.DirectionalLight(0xfff8e7, 1.8)
sun.position.set(4, 6, 3)
scene.add(sun)
scene.add(new THREE.AmbientLight(0xffffff, 0.3))

// ── Animation ─────────────────────────────────────────────────────────────────

function animate() {
  requestAnimationFrame(animate)
  renderer.render(scene, camera)
}
animate()

// ── Cleanup ───────────────────────────────────────────────────────────────────

// metalSiding.dispose()
// metalRoof.dispose()
// wallGeo.dispose()
// roofGeo.dispose()
