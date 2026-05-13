import * as THREE from 'three'
import { WebGPURenderer } from 'three/webgpu'
import { color, float, mix, triNoise3D, uniform, vec3 } from 'three/tsl'
import { GPUParticleSystem } from './index'

const renderer = new WebGPURenderer()
renderer.setSize(window.innerWidth, window.innerHeight)
document.body.appendChild(renderer.domElement)

const scene = new THREE.Scene()
scene.background = new THREE.Color(0x080808)

const camera = new THREE.PerspectiveCamera(60, window.innerWidth / window.innerHeight, 0.1, 100)
camera.position.set(0, 3, 10)
camera.lookAt(0, 2, 0)

// Runtime-mutable drift uniform — shows how to add custom uniforms in builder functions
const uDrift = uniform(0.25)

// Fire embers: rise upward + lateral drift + turbulence noise
// Demonstrates custom physics that SparkSystem doesn't cover
const embers = new GPUParticleSystem({
  count: 600,
  lifetime: 2.5,
  shape: 'disc',
  spread: Math.PI / 3,
  buildPosition: ({ aDir, tScaled, uTime }) => {
    const rise = vec3(0, float(0.8), 0).mul(tScaled)
    const drift = aDir.mul(uDrift).mul(tScaled)
    const noiseInput = drift.add(rise).mul(float(1.2))
    const noise = triNoise3D(noiseInput, float(0.5), uTime)
    return rise.add(drift).add(vec3(1, 0, 1).mul(noise.sub(float(0.5))).mul(float(0.5)))
  },
  buildColor: ({ t }) => mix(color(0xffcc44), color(0xff2200), t),
  buildSize: ({ bell }) => mix(float(2.0), float(7.0), bell),
  buildOpacity: ({ bell }) => bell.mul(float(0.9)),
})

scene.add(embers.points)
embers.points.position.set(0, 0, 0)

const clock = new THREE.Clock()

async function init() {
  await renderer.init()
  renderer.setAnimationLoop(() => {
    embers.update(clock.getElapsedTime())
    renderer.render(scene, camera)
  })
}

init().catch(console.error)

window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight
  camera.updateProjectionMatrix()
  renderer.setSize(window.innerWidth, window.innerHeight)
})
