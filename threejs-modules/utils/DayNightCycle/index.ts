/**
 * VỊ TRÍ   — threejs-modules/utils/DayNightCycle/index.ts
 * VAI TRÒ  — Chu kỳ ngày-đêm: drive DirectionalLight (mặt trời) và AmbientLight theo thời gian
 * LIÊN HỆ  — Kết hợp với GlobalUniforms để sync uTime cho shader — caller tự gọi
 *
 * CÁCH DÙNG:
 *   const dayNight = new DayNightCycle({ sunLight, ambientLight, speed: 0.05 })
 *   // animation loop:
 *   dayNight.update(clock.getDelta())  ← getDelta(), không phải getElapsedTime()
 *
 * DISPOSE: dayNight.dispose() — không dispose lights, caller sở hữu lights
 */

import * as THREE from 'three'

export interface DayNightCycleOptions {
  /** DirectionalLight đại diện mặt trời */
  sunLight: THREE.DirectionalLight
  /** AmbientLight cho sky scatter */
  ambientLight: THREE.AmbientLight
  /**
   * Tốc độ chu kỳ [cycles/giây].
   * 0.05 = 20 giây/chu kỳ. Default: 0.05
   */
  speed?: number
  /**
   * Thời điểm bắt đầu [0–1].
   * 0=nửa đêm, 0.25=bình minh, 0.5=giữa trưa, 0.75=hoàng hôn. Default: 0.25
   */
  startTime?: number
}

const NIGHT_SUN = new THREE.Color(0x0a0a1a)
const DAWN_SUN = new THREE.Color(0xff7043)
const NOON_SUN = new THREE.Color(0xfff8e1)
const DUSK_SUN = new THREE.Color(0xff5722)
const NIGHT_AMB = new THREE.Color(0x050510)
const DAY_AMB = new THREE.Color(0x8090b0)

export class DayNightCycle {
  private normalizedTime: number
  private readonly speed: number
  private readonly sunLight: THREE.DirectionalLight
  private readonly ambientLight: THREE.AmbientLight
  private isDisposed = false

  constructor(opts: DayNightCycleOptions) {
    this.sunLight = opts.sunLight
    this.ambientLight = opts.ambientLight
    this.speed = opts.speed ?? 0.05
    this.normalizedTime = opts.startTime ?? 0.25
    this.applyLighting()
  }

  /**
   * Advance time mỗi frame.
   * Dùng clock.getDelta() — delta seconds kể từ frame trước.
   */
  update(deltaTime: number): void {
    if (this.isDisposed) return
    this.normalizedTime = (this.normalizedTime + deltaTime * this.speed) % 1.0
    this.applyLighting()
  }

  /**
   * Seek trực tiếp đến thời điểm trong ngày.
   * 0 = nửa đêm, 0.25 = bình minh, 0.5 = giữa trưa, 0.75 = hoàng hôn
   */
  setNormalizedTime(t: number): void {
    if (this.isDisposed) return
    this.normalizedTime = ((t % 1.0) + 1.0) % 1.0
    this.applyLighting()
  }

  getNormalizedTime(): number {
    return this.normalizedTime
  }

  private applyLighting(): void {
    const t = this.normalizedTime
    // Angle: 0=midnight (bottom), 0.25=east horizon, 0.5=zenith, 0.75=west horizon
    const angle = t * Math.PI * 2 - Math.PI / 2
    const sunX = Math.cos(angle)
    const sunY = Math.sin(angle)

    this.sunLight.position.set(sunX * 10, sunY * 10, 3)

    // sunY trong [-1,1] — chỉ chiếu sáng khi trên đường chân trời (sunY > 0)
    const elevation = Math.max(0, sunY)
    this.sunLight.intensity = elevation * 2.5

    // Màu mặt trời: lạnh về đêm → ấm ở chân trời → trắng ở giữa trưa
    const isRising = t < 0.5
    const horizonColor = isRising ? DAWN_SUN : DUSK_SUN
    if (elevation < 0.2) {
      this.sunLight.color.copy(NIGHT_SUN).lerp(horizonColor, elevation / 0.2)
    } else {
      this.sunLight.color.copy(horizonColor).lerp(NOON_SUN, (elevation - 0.2) / 0.8)
    }

    // Ambient: tối về đêm, sáng ban ngày
    this.ambientLight.color.copy(NIGHT_AMB).lerp(DAY_AMB, elevation)
    this.ambientLight.intensity = 0.2 + elevation * 0.8
  }

  dispose(): void {
    // Lights owned by caller — không dispose, chỉ đánh dấu
    this.isDisposed = true
  }
}
