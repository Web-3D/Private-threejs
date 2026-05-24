/**
 * ConcretePanel — standalone usage example
 */

import * as THREE from 'three'
import { WebGPURenderer } from 'three/webgpu'
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'
import { ConcretePanel } from './index'

const renderer = new WebGPURenderer({ antialias: true })
renderer.setSize(window.innerWidth, window.innerHeight)
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2))
renderer.shadowMap.enabled = true
document.body.appendChild(renderer.domElement)

const scene = new THREE.Scene()
scene.background = new THREE.Color(0x87ceeb)

const camera = new THREE.PerspectiveCamera(55, window.innerWidth / window.innerHeight, 0.1, 200)
camera.position.set(6, 4, 8)

const controls = new OrbitControls(camera, renderer.domElement)
controls.enableDamping = true

const sun = new THREE.DirectionalLight(0xfff5e0, 2.5)
sun.position.set(5, 10, 5)
sun.castShadow = true
scene.add(sun)
scene.add(new THREE.AmbientLight(0xffffff, 0.4))

const concrete = new ConcretePanel({
  panelW: 1.20,
  panelH: 2.40,
  seamW: 0.010,
  fbmAmp: 0.055,
  roughness: 0.018,
  blendSharpness: 8.0,
  baseColor: 0xacaba4,
  seamColor: 0x706f6a,
})

const buildingGeo = new THREE.BoxGeometry(6, 7.2, 5)
const building = new THREE.Mesh(buildingGeo, concrete.getMaterial())
building.position.y = 3.6
building.castShadow = true
scene.add(building)

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

// Cleanup: concrete.dispose(), buildingGeo.dispose(), groundGeo.dispose(), groundMat.dispose()
