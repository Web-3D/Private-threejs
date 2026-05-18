/**
 * VỊ TRÍ  : threejs-modules/utils/AnimationSystem/index.ts
 * VAI TRÒ : AnimationMixer wrapper — play/pause/crossfade clips từ glTF
 * LIÊN HỆ : RuntimeGuard (dependency), nhận clips từ GLTFLoader.animations
 *
 * CÁCH DÙNG:
 *   const anim = new AnimationSystem({ root: gltf.scene, clips: gltf.animations })
 *   anim.play('Idle')
 *   anim.crossFade('Walk', 0.3)
 *   // trong animation loop:
 *   anim.update(delta)
 *   // cleanup:
 *   anim.dispose()
 * DISPOSE: mixer.stopAllAction() + uncacheRoot
 */

import { AnimationMixer, LoopOnce, LoopRepeat } from 'three'
import type * as THREE from 'three'

export interface PlayOptions {
  /** Default: true */
  loop?: boolean
  /** Fade-in duration (giây) khi gọi play trực tiếp. Default: 0 */
  fadeIn?: number
  /** Dừng ở frame cuối nếu LoopOnce. Default: false */
  clampWhenFinished?: boolean
}

export interface AnimationSystemOptions {
  /** Root object của glTF model — thường là gltf.scene */
  root: THREE.Object3D
  /** Danh sách clips — thường là gltf.animations */
  clips: THREE.AnimationClip[]
}

export class AnimationSystem {
  private mixer: AnimationMixer
  private clips = new Map<string, THREE.AnimationClip>()
  private currentAction: THREE.AnimationAction | null = null
  private isDisposed = false

  constructor(opts: AnimationSystemOptions) {
    this.mixer = new AnimationMixer(opts.root)
    for (const clip of opts.clips) {
      this.clips.set(clip.name, clip)
    }
  }

  /** Danh sách tên clip có sẵn */
  getClipNames(): string[] {
    return Array.from(this.clips.keys())
  }

  private warnMissing(name: string): void {
    console.warn('[AnimationSystem] clip "' + name + '" không tồn tại. Có: ' + this.getClipNames().join(', '))
  }

  /**
   * Chạy clip ngay lập tức. Nếu đang có clip khác → stop trước.
   * Dùng crossFade() nếu cần transition mềm.
   */
  play(name: string, opts: PlayOptions = {}): void {
    if (this.isDisposed) return
    const clip = this.clips.get(name)
    if (!clip) {
      this.warnMissing(name)
      return
    }

    const action = this.mixer.clipAction(clip)
    action.loop = (opts.loop ?? true) ? LoopRepeat : LoopOnce
    action.clampWhenFinished = opts.clampWhenFinished ?? false

    if (this.currentAction && this.currentAction !== action) {
      this.currentAction.stop()
    }

    if (opts.fadeIn && opts.fadeIn > 0) {
      action.reset().setEffectiveWeight(0).play()
      action.fadeIn(opts.fadeIn)
    } else {
      action.reset().play()
    }

    this.currentAction = action
  }

  /**
   * Crossfade từ clip hiện tại sang clip mới.
   * Nếu chưa có clip nào đang chạy → play trực tiếp.
   */
  crossFade(name: string, duration = 0.3, opts: Omit<PlayOptions, 'fadeIn'> = {}): void {
    if (this.isDisposed) return
    const clip = this.clips.get(name)
    if (!clip) {
      this.warnMissing(name)
      return
    }

    if (!this.currentAction) {
      this.play(name, opts)
      return
    }

    const nextAction = this.mixer.clipAction(clip)
    nextAction.loop = (opts.loop ?? true) ? LoopRepeat : LoopOnce
    nextAction.clampWhenFinished = opts.clampWhenFinished ?? false
    nextAction.reset().setEffectiveWeight(1).play()

    this.currentAction.crossFadeTo(nextAction, duration, true)
    this.currentAction = nextAction
  }

  /** Tạm dừng clip đang chạy */
  pause(): void {
    if (this.currentAction) this.currentAction.paused = true
  }

  /** Tiếp tục clip đang bị pause */
  resume(): void {
    if (this.currentAction) this.currentAction.paused = false
  }

  /** Dừng hoàn toàn clip đang chạy */
  stop(): void {
    if (this.currentAction) {
      this.currentAction.stop()
      this.currentAction = null
    }
  }

  /** Gọi mỗi frame trong animation loop. delta = thời gian từ frame trước (giây). */
  update(delta: number): void {
    if (this.isDisposed) return
    this.mixer.update(delta)
  }

  dispose(): void {
    if (this.isDisposed) return
    this.mixer.stopAllAction()
    this.mixer.uncacheRoot(this.mixer.getRoot())
    this.clips.clear()
    this.currentAction = null
    this.isDisposed = true
  }
}
