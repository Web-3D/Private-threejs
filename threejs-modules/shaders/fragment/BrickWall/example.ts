/**
 * BrickWall — standalone usage example
 * Chạy độc lập không cần project setup.
 * Tạo BoxGeometry building block + apply BrickWall material.
 */

import * as THREE from 'three'
import { WebGPURenderer } from 'three/webgpu'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { BrickWall } from './index'

// ── Setup ─────────────────────────────────────────────────────────────────────

const renderer = new WebGPURenderer({ antialias: true })
renderer.setSize(window.innerWidth, window.innerHeight)
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
renderer.shadowMap.enabled = true
document.body.appendChild(renderer.domElement)

const scene = new THREE.Scene()
scene.background = new THREE.Color(0x87ceeb) // sky blue

const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 200)
camera.position.set(6, 4, 8)

const controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = true

// ── Lighting ──────────────────────────────────────────────────────────────────

const sun = new THREE.DirectionalLight(0xfff5e0, 2.5)
sun.position.set(5, 10, 5)
sun.castShadow = true
scene.add(sun)

scene.add(new THREE.AmbientLight(0xffffff, 0.4))

// ── BrickWall material ────────────────────────────────────────────────────────

const brickWall = new BrickWall({
  brickW: 0.40,         // 40 cm — standard Japanese brick
  brickH: 0.20,         // 20 cm
  mortar: 0.015,        // 15 mm mortar joint
  variation: 0.08,      // subtle per-brick colour variation
  roughness: 0.025,
  blendSharpness: 8.0,
  brickColor: 0xb86042, // terra cotta
  mortarColor: 0xc7c4be,
})

// ── Building box ──────────────────────────────────────────────────────────────

const buildingGeo = new THREE.BoxGeometry(5, 6, 4)
const buildingMesh = new THREE.Mesh(buildingGeo, brickWall.getMaterial())
buildingMesh.position.y = 3
buildingMesh.castShadow = true
scene.add(buildingMesh)

// Ground
const groundGeo = new THREE.PlaneGeometry(20, 20)
const groundMat = new THREE.MeshStandardMaterial({ color: 0x888888 })
const ground = new THREE.Mesh(groundGeo, groundMat)
ground.rotation.x = -Math.PI / 2
ground.receiveShadow = true
scene.add(ground)

// ── Resize ────────────────────────────────────────────────────────────────────

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(window.innerWidth, window.innerHeight)
})

// ── Loop ──────────────────────────────────────────────────────────────────────

renderer.setAnimationLoop(async () => {
  controls.update()
  await renderer.renderAsync(scene, camera)
})

// ── Cleanup ───────────────────────────────────────────────────────────────────

// Call on unmount / HMR dispose:
// brickWall.dispose()
// buildingGeo.dispose()
// groundGeo.dispose()
// groundMat.dispose()
