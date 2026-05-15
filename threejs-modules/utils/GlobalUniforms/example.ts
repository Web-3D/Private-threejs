import * as THREE from 'three'

import { GlobalUniforms } from './index'

export async function createDemo(canvas: HTMLCanvasElement): Promise<{ dispose(): void }> {
  const w = canvas.clientWidth || 300
  const h = canvas.clientHeight || 200

  const renderer = new THREE.WebGLRenderer({ canvas, antialias: true })
  renderer.setPixelRatio(1)
  renderer.setSize(w, h)

  const scene = new THREE.Scene()
  const camera = new THREE.PerspectiveCamera(75, w / h, 0.1, 100)
  camera.position.z = 3

  const material = new THREE.ShaderMaterial({
    uniforms: {
      uColor: { value: new THREE.Color(0x4488ff) },
    },
    vertexShader: `
      uniform float uTime;
      varying vec2 vUv;
      void main() {
        vUv = uv;
        vec3 pos = position;
        pos.y += sin(pos.x * 3.0 + uTime * 2.0) * 0.1;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(pos, 1.0);
      }
    `,
    fragmentShader: `
      uniform vec3 uColor;
      uniform float uWeather;
      varying vec2 vUv;
      void main() {
        vec3 col = uColor * (1.0 - uWeather * 0.5);
        gl_FragColor = vec4(col, 1.0);
      }
    `,
  })

  const globalUniforms = GlobalUniforms.getInstance()
  globalUniforms.inject(material)

  const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2, 32, 32), material)
  scene.add(mesh)

  const clock = new THREE.Clock()

  renderer.setAnimationLoop(() => {
    globalUniforms.update(clock.getDelta())
    renderer.render(scene, camera)
  })

  return {
    dispose() {
      renderer.setAnimationLoop(null)
      material.dispose()
      mesh.geometry.dispose()
      renderer.dispose()
    },
  }
}
