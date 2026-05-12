import type * as THREE from 'three'

type InjectableMaterial = THREE.ShaderMaterial | THREE.RawShaderMaterial

export class GlobalUniforms {
  private static instance: GlobalUniforms | null = null
  private isDisposed = false

  readonly uTime = { value: 0 }
  readonly uWeather = { value: 0 } // 0 = dry/sun, 1 = rain/wet
  readonly uDamage = { value: 0 } // 0 = intact, 1 = destroyed

  private constructor() {}

  static getInstance(): GlobalUniforms {
    if (!GlobalUniforms.instance || GlobalUniforms.instance.isDisposed) {
      GlobalUniforms.instance = new GlobalUniforms()
    }
    return GlobalUniforms.instance
  }

  /** Gọi ĐẦU TIÊN trong animation loop. deltaTime = THREE.Clock.getDelta() */
  update(deltaTime: number): void {
    if (this.isDisposed) return
    this.uTime.value += deltaTime
  }

  /**
   * Inject uTime, uWeather, uDamage vào material.
   * Dùng shared reference — material tự nhận update mỗi frame.
   */
  inject(material: InjectableMaterial): void {
    if (this.isDisposed) return
    material.uniforms.uTime = this.uTime
    material.uniforms.uWeather = this.uWeather
    material.uniforms.uDamage = this.uDamage
  }

  /** Range [0, 1]. 0 = khô/nắng, 1 = mưa/ướt */
  setWeather(value: number): void {
    if (this.isDisposed) return
    this.uWeather.value = Math.max(0, Math.min(1, value))
  }

  /** Range [0, 1]. 0 = nguyên vẹn, 1 = đổ nát hoàn toàn */
  setDamage(value: number): void {
    if (this.isDisposed) return
    this.uDamage.value = Math.max(0, Math.min(1, value))
  }

  dispose(): void {
    if (this.isDisposed) return
    GlobalUniforms.instance = null
    this.isDisposed = true
  }
}
