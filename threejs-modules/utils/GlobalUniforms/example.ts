// Standalone demo — chạy được mà không cần project setup
import * as THREE from 'three'

import { GlobalUniforms } from './index'

const renderer = new THREE.WebGLRenderer({ antialias: true })
renderer.setSize(800, 600)
document.body.appendChild(renderer.domElement)

const scene = new THREE.Scene()
const camera = new THREE.PerspectiveCamera(75, 800 / 600, 0.1, 100)
camera.position.z = 3

// Shader dùng uTime từ GlobalUniforms
const material = new THREE.ShaderMaterial({
  uniforms: {
    uColor: { value: new THREE.Color(0x4488ff) },
    // uTime sẽ được inject — không khai báo ở đây
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
      // Tối dần khi uWeather tăng (trời mưa)
      vec3 color = uColor * (1.0 - uWeather * 0.5);
      gl_FragColor = vec4(color, 1.0);
    }
  `,
})

// Inject global uniforms vào material
const globalUniforms = GlobalUniforms.getInstance()
globalUniforms.inject(material)

const mesh = new THREE.Mesh(new THREE.PlaneGeometry(2, 2, 32, 32), material)
scene.add(mesh)

// Test weather change sau 2 giây
setTimeout(() => globalUniforms.setWeather(0.8), 2000)

const clock = new THREE.Clock()

function animate() {
  requestAnimationFrame(animate)
  globalUniforms.update(clock.getDelta()) // ← luôn đầu tiên
  renderer.render(scene, camera)
}

animate()

// Cleanup
window.addEventListener('beforeunload', () => {
  material.dispose()
  mesh.geometry.dispose()
  globalUniforms.dispose()
  renderer.dispose()
})
