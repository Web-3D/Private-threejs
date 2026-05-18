/**
 * VỊ TRÍ  : threejs-modules/utils/ScrollTimeline/index.ts
 * VAI TRÒ : Scroll-driven camera path — map scroll position → camera position trên CatmullRomCurve3
 * LIÊN HỆ : GlobalUniforms (optional — nếu scene có uTime), dùng trong World class
 *
 * CÁCH DÙNG:
 *   const timeline = new ScrollTimeline({
 *     camera,
 *     points: [new THREE.Vector3(0,0,5), new THREE.Vector3(5,2,0), new THREE.Vector3(0,0,-5)],
 *     lookAt: new THREE.Vector3(0, 0, 0),
 *   })
 *   // trong animation loop:
 *   timeline.update()
 *   // cleanup:
 *   timeline.dispose()
 * DISPOSE: remove scroll event listener
 */

import { CatmullRomCurve3, Vector3, MathUtils } from 'three'
import type * as THREE from 'three'

export type LookAtMode =
  | { type: 'fixed'; target: THREE.Vector3 }   // camera nhìn vào 1 điểm cố định
  | { type: 'tangent' }                          // camera nhìn theo hướng di chuyển

export interface ScrollTimelineOptions {
  camera: THREE.Camera
  /** Các waypoint định nghĩa camera path */
  points: THREE.Vector3[]
  /** Cách camera nhìn. Default: fixed tại origin */
  lookAt?: LookAtMode
  /** Element scroll container. Default: window */
  scrollEl?: HTMLElement | Window
  /** Lerp speed — bao nhanh camera bắt kịp scroll. [0-1], default: 0.08 */
  smoothing?: number
  /** Bắt đầu animation khi scroll xuống thêm bao nhiêu px. Default: 0 */
  startOffset?: number
}

export class ScrollTimeline {
  private curve: CatmullRomCurve3
  private camera: THREE.Camera
  private lookAt: LookAtMode
  private scrollEl: HTMLElement | Window
  private smoothing: number
  private startOffset: number

  /** Target progress từ scroll (raw). currentT lerp về đây. */
  private targetT = 0
  /** Progress hiện tại đã smoothed */
  private currentT = 0

  private tmpPoint = new Vector3()
  private tmpTangent = new Vector3()
  private isDisposed = false

  private boundOnScroll: () => void

  constructor(opts: ScrollTimelineOptions) {
    if (opts.points.length < 2) {
      throw new Error('[ScrollTimeline] cần ít nhất 2 waypoints')
    }

    this.curve = new CatmullRomCurve3(opts.points)
    this.camera = opts.camera
    this.lookAt = opts.lookAt ?? { type: 'fixed', target: new Vector3(0, 0, 0) }
    this.scrollEl = opts.scrollEl ?? window
    this.smoothing = MathUtils.clamp(opts.smoothing ?? 0.08, 0.001, 1)
    this.startOffset = opts.startOffset ?? 0

    this.boundOnScroll = this.onScroll.bind(this)
    this.scrollEl.addEventListener('scroll', this.boundOnScroll, { passive: true })

    // Set vị trí ban đầu ngay
    this.onScroll()
    this.currentT = this.targetT
    this.applyCamera()
  }

  /** Progress [0, 1] hiện tại (smoothed) */
  getProgress(): number {
    return this.currentT
  }

  /**
   * Gọi mỗi frame. Lerp currentT → targetT và apply vào camera.
   */
  update(): void {
    if (this.isDisposed) return
    this.currentT = MathUtils.lerp(this.currentT, this.targetT, this.smoothing)
    this.applyCamera()
  }

  private applyCamera(): void {
    this.curve.getPointAt(this.currentT, this.tmpPoint)
    this.camera.position.copy(this.tmpPoint)

    if (this.lookAt.type === 'fixed') {
      this.camera.lookAt(this.lookAt.target)
    } else {
      // Tangent — nhìn theo hướng di chuyển
      // Dùng t nhỏ hơn một chút để tránh singularity ở t=1
      const tLook = Math.min(this.currentT + 0.01, 1)
      this.curve.getPointAt(tLook, this.tmpTangent)
      this.camera.lookAt(this.tmpTangent)
    }
  }

  private onScroll(): void {
    if (this.isDisposed) return

    let scrollTop: number
    let maxScroll: number

    if (this.scrollEl instanceof Window) {
      scrollTop = window.scrollY
      maxScroll = document.documentElement.scrollHeight - window.innerHeight
    } else {
      scrollTop = this.scrollEl.scrollTop
      maxScroll = this.scrollEl.scrollHeight - this.scrollEl.clientHeight
    }

    const adjusted = Math.max(0, scrollTop - this.startOffset)
    const adjustedMax = Math.max(1, maxScroll - this.startOffset)
    this.targetT = MathUtils.clamp(adjusted / adjustedMax, 0, 1)
  }

  dispose(): void {
    if (this.isDisposed) return
    this.scrollEl.removeEventListener('scroll', this.boundOnScroll)
    this.isDisposed = true
  }
}
