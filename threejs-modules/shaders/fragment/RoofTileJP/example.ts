/**
 * RoofTileJP — standalone usage example
 * Tạo roof surface với kawara tile material.
 */

import * as THREE from 'three'
import { WebGPURenderer } from 'three/webgpu'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { RoofTileJP } from './index'

const renderer = new WebGPURenderer({ antialias: true })
renderer.setSize(window.innerWidth, window.innerHeight)
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
renderer.shadowMap.enabled = true
document.body.appendChild(renderer.domElement)

const scene = new THREE.Scene()
scene.background = new THREE.Color(0x87ceeb)

const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 200)
camera.position.set(5, 5, 8)

const controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = true

const sun = new THREE.DirectionalLight(0xfff5e0, 2.5)
sun.position.set(5, 10, 3)
sun.castShadow = true
scene.add(sun)
scene.add(new THREE.AmbientLight(0xffffff, 0.4))

const roofTile = new RoofTileJP({
  tileW: 0.28,
  tileH: 0.34,
  gap: 0.008,
  tileColor: 0x383839,  // dark charcoal
  ridgeColor: 0x464647,
  gapColor: 0x1e1d1d,
})

// Gabled roof approximation: 2 slanted planes
const roofGeo = new THREE.BoxGeometry(6, 0.12, 4)

// Left slope
const leftSlope = new THREE.Mesh(roofGeo, roofTile.getMaterial())
leftSlope.rotation.z = Math.PI / 6  // 30° slope
leftSlope.position.set(-1.5, 4.2, 0)
leftSlope.castShadow = true
scene.add(leftSlope)

// Right slope
const rightSlope = new THREE.Mesh(roofGeo, roofTile.getMaterial())
rightSlope.rotation.z = -Math.PI / 6
rightSlope.position.set(1.5, 4.2, 0)
rightSlope.castShadow = true
scene.add(rightSlope)

// Wall body under roof
const wallGeo = new THREE.BoxGeometry(6, 4, 4)
const wallMat = new THREE.MeshStandardMaterial({ color: 0xd4c9a8 })
const wall = new THREE.Mesh(wallGeo, wallMat)
wall.position.y = 2
scene.add(wall)

const groundGeo = new THREE.PlaneGeometry(20, 20)
const groundMat = new THREE.MeshStandardMaterial({ color: 0x888888 })
const ground = new THREE.Mesh(groundGeo, groundMat)
ground.rotation.x = -Math.PI / 2
ground.receiveShadow = true
scene.add(ground)

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(window.innerWidth, window.innerHeight)
})

renderer.setAnimationLoop(async () => {
  controls.update()
  await renderer.renderAsync(scene, camera)
})

// Cleanup:
// roofTile.dispose()
// roofGeo.dispose(), wallGeo.dispose(), groundGeo.dispose(), wallMat.dispose(), groundMat.dispose()
