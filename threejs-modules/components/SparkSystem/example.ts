import * as THREE from 'three'
import { WebGPURenderer } from 'three/webgpu'
import { SparkSystem } from './index'

const renderer = new WebGPURenderer()
renderer.setSize(window.innerWidth, window.innerHeight)
document.body.appendChild(renderer.domElement)

const scene = new THREE.Scene()
scene.background = new THREE.Color(0x111111)

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 100)
camera.position.set(0, 2, 8)
camera.lookAt(0, 2, 0)

const sparks = new SparkSystem({
  count: 500,
  lifetime: 1.5,
  speed: 4.0,
  gravity: 4.0,
  spread: Math.PI / 4,
  turbulence: true,
  shape: 'cone',
})
scene.add(sparks.points)

const clock = new THREE.Clock()

async function init() {
  await renderer.init()
  renderer.setAnimationLoop(() => {
    sparks.update(clock.getElapsedTime())
    renderer.render(scene, camera)
  })
}

init().catch(console.error)

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(window.innerWidth, window.innerHeight)
})
