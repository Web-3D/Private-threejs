/**
 * VỊ TRÍ   — threejs-modules/components/PostProcessing/index.ts
 * VAI TRÒ  — WebGPU post-processing pipeline: scene pass → bloom → output
 * LIÊN HỆ  — Thay thế renderer.render(scene, camera) bằng pp.render() trong animation loop
 *
 * CÁCH DÙNG:
 *   const pp = new PostProcessingManager({ renderer, scene, camera })
 *   // animation loop — KHÔNG gọi renderer.render() nữa:
 *   pp.render()
 *
 * DISPOSE: pp.dispose() — không dispose renderer/scene/camera, caller sở hữu
 */

import { PostProcessing } from 'three/webgpu'
import { pass } from 'three/src/nodes/display/PassNode.js'
import { bloom } from 'three/addons/tsl/display/BloomNode.js'
import type * as THREE from 'three'
import type { WebGPURenderer } from 'three/webgpu'

export interface PostProcessingOptions {
  /** WebGPURenderer đang dùng cho scene */
  renderer: WebGPURenderer
  scene: THREE.Scene
  camera: THREE.Camera
  /** Bloom intensity [0–3]. Default: 1.2 */
  bloomStrength?: number
  /** Bloom blur radius. Default: 0.4 */
  bloomRadius?: number
  /** Brightness threshold để bloom [0–1]. Default: 0.85 */
  bloomThreshold?: number
}

export class PostProcessingManager {
  private pp: PostProcessing | null = null
  private isDisposed = false

  constructor(opts: PostProcessingOptions) {
    const scenePass = pass(opts.scene, opts.camera)
    const bloomEffect = bloom(
      scenePass,
      opts.bloomStrength ?? 1.2,
      opts.bloomRadius ?? 0.4,
      opts.bloomThreshold ?? 0.85,
    )

    const pp = new PostProcessing(opts.renderer, bloomEffect)
    pp.outputColorTransform = true  // tone mapping + color space tự động
    this.pp = pp
  }

  /**
   * Gọi thay thế renderer.render(scene, camera) trong animation loop.
   * PostProcessing tự render scene qua pipeline → bloom → output.
   */
  render(): void {
    this.pp?.render()
  }

  dispose(): void {
    if (this.isDisposed) return
    this.pp?.dispose()
    this.pp = null
    this.isDisposed = true
    // renderer/scene/camera owned by caller — không dispose
  }
}
