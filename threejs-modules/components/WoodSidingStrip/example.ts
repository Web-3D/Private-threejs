/**
 * example.ts — demo standalone WoodSidingStrip (1 khối liền), log triangle.
 */

import * as THREE from 'three'

import { WoodSidingStrip } from './index'

const scene = new THREE.Scene()
const camera = new THREE.PerspectiveCamera(60, 1, 0.1, 100)
camera.position.set(0, 1.5, 6)

const sun = new THREE.DirectionalLight(0xffffff, 2)
sun.position.set(4, 6, 5)
sun.castShadow = true
scene.add(sun, new THREE.HemisphereLight(0xbcd4ff, 0x6b5240, 0.6))

const wall = new WoodSidingStrip({ width: 8, height: 3 })
scene.add(wall.getMesh())

// eslint-disable-next-line no-console
console.log(`WoodSidingStrip: ${wall.getTriangleCount()} triangles (1 mesh, merge được)`)

export function cleanup(): void {
  wall.dispose()
}
