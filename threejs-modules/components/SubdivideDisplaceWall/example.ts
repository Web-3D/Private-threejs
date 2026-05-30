/**
 * example.ts — demo standalone SubdivideDisplaceWall, log triangle để so với InstancedBrickWall.
 */

import * as THREE from 'three'

import { SubdivideDisplaceWall } from './index'

const scene = new THREE.Scene()
const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 100)
camera.position.set(0, 1.5, 6)

const sun = new THREE.DirectionalLight(0xffffff, 2)
sun.position.set(4, 6, 5)
sun.castShadow = true
scene.add(sun, new THREE.HemisphereLight(0xbcd4ff, 0x6b5240, 0.6))

const wall = new SubdivideDisplaceWall({ width: 8, height: 3, subdivPerBrick: 3 })
scene.add(wall.getGroup())

// eslint-disable-next-line no-console
console.log(`SubdivideDisplaceWall: ${wall.getTriangleCount()} triangles`)

export function cleanup(): void {
  wall.dispose()
}
