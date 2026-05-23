/**
 * VỊ TRÍ   — threejs-modules/utils/audio/AudioSystem/index.ts
 * VAI TRÒ  — Spatial audio system — load/cache AudioBuffer, play positional SFX tại world position
 * LIÊN HỆ  — Dùng trong CollisionEventBus.onImpact callback: audio.play('crash', e.position)
 *
 * CÁCH DÙNG:
 *   const audio = new AudioSystem({ refDistance: 2 })
 *   camera.add(audio.getListener())   // listener PHẢI gắn vào camera
 *   scene.add(audio.getRoot())        // root PHẢI có trong scene để panner update đúng
 *
 *   await audio.load('crash', '/sounds/crash.ogg')
 *   audio.play('crash', { x: 1, y: 0, z: -3 })   // positional — giảm volume theo khoảng cách
 *   audio.play('ambient')                          // global — không phụ thuộc vị trí
 *
 * DISPOSE:
 *   audio.dispose()  — stop tất cả active sounds, disconnect Web Audio graph, clear cache
 */

import * as THREE from 'three'

export interface AudioSystemOptions {
  /** Khoảng cách (units) tại đó volume = 100%. Default: 1 */
  refDistance?: number
  /** Tốc độ giảm volume khi ra xa. Default: 1 */
  rolloffFactor?: number
  /** Khoảng cách tối đa — xa hơn thì volume = 0. Default: 100 */
  maxDistance?: number
}

export interface SoundPosition {
  x: number
  y: number
  z: number
}

export class AudioSystem {
  private listener: THREE.AudioListener
  private loader: THREE.AudioLoader
  /** Dummy root trong scene graph — tất cả PositionalAudio nodes gắn vào đây */
  private root: THREE.Object3D
  private buffers = new Map<string, AudioBuffer>()
  /** Track active positional sounds để cleanup đúng lúc dispose() */
  private activeSounds = new Set<THREE.PositionalAudio>()
  private opts: Required<AudioSystemOptions>
  private isDisposed = false

  constructor(opts: AudioSystemOptions = {}) {
    this.opts = {
      refDistance: opts.refDistance ?? 1,
      rolloffFactor: opts.rolloffFactor ?? 1,
      maxDistance: opts.maxDistance ?? 100,
    }
    this.listener = new THREE.AudioListener()
    this.loader = new THREE.AudioLoader()
    this.root = new THREE.Object3D()
    this.root.name = 'AudioSystem_root'
  }

  /**
   * Trả về AudioListener để gắn vào camera: `camera.add(audio.getListener())`
   * Vị trí của listener = "tai nghe" — ảnh hưởng trực tiếp đến spatial pan và volume.
   */
  getListener(): THREE.AudioListener {
    return this.listener
  }

  /**
   * Trả về root Object3D để thêm vào scene: `scene.add(audio.getRoot())`
   * Positional sounds cần nằm trong scene graph để Three.js cập nhật panner world position
   * mỗi frame qua updateMatrixWorld(). Thiếu bước này → sound phát đúng nhưng không có spatial effect.
   */
  getRoot(): THREE.Object3D {
    return this.root
  }

  /**
   * Load audio file từ URL và cache theo tên.
   * Re-load cùng tên → bỏ qua, dùng buffer đã cache.
   */
  async load(name: string, url: string): Promise<void> {
    if (this.buffers.has(name)) return
    return new Promise<void>((resolve, reject) => {
      this.loader.load(
        url,
        (buffer) => {
          this.buffers.set(name, buffer)
          resolve()
        },
        undefined,
        reject,
      )
    })
  }

  /**
   * Inject AudioBuffer tạo sẵn — bỏ qua URL loading.
   * Dùng khi muốn generate sound procedurally (test, synthetic tone) thay vì load file.
   */
  addBuffer(name: string, buffer: AudioBuffer): void {
    this.buffers.set(name, buffer)
  }

  /**
   * Resume Web Audio context. Browsers yêu cầu user gesture trước khi cho phép audio.
   * Gọi từ click/pointerdown handler: `canvas.addEventListener('click', () => audio.resume())`
   */
  async resume(): Promise<void> {
    await this.listener.context.resume()
  }

  /**
   * Play sound.
   * - Có `position` → PositionalAudio: volume và pan phụ thuộc khoảng cách từ camera
   * - Không có `position` → THREE.Audio global: nghe ở mọi nơi như nhau
   * One-shot: mỗi lần gọi tạo AudioNode mới, tự dọn sau khi kết thúc.
   *
   * @param name    - Tên đã load/addBuffer trước đó
   * @param position - World position nguồn âm thanh (optional)
   * @param volume  - 0.0 tới 1.0. Default: 1
   */
  play(name: string, position?: SoundPosition, volume = 1): void {
    if (this.isDisposed) return
    const buffer = this.buffers.get(name)
    if (!buffer) return

    // Thử resume context — có thể fail nếu chưa có user gesture
    void this.listener.context.resume()

    if (position) {
      this._playPositional(buffer, position, volume)
    } else {
      this._playAmbient(buffer, volume)
    }
  }

  /** Master volume cho toàn bộ scene — 0.0 tới 1.0. */
  setMasterVolume(value: number): void {
    this.listener.setMasterVolume(Math.max(0, Math.min(1, value)))
  }

  getMasterVolume(): number {
    return this.listener.getMasterVolume()
  }

  dispose(): void {
    if (this.isDisposed) return

    for (const sound of this.activeSounds) {
      if (sound.isPlaying) sound.stop()
      try { sound.gain.disconnect() } catch { /* already disconnected */ }
      try { sound.panner.disconnect() } catch { /* already disconnected */ }
      this.root.remove(sound)
    }
    this.activeSounds.clear()
    this.buffers.clear()

    this.listener.parent?.remove(this.listener)
    this.root.parent?.remove(this.root)

    this.isDisposed = true
  }

  private _playPositional(buffer: AudioBuffer, pos: SoundPosition, volume: number): void {
    const sound = new THREE.PositionalAudio(this.listener)
    sound.position.set(pos.x, pos.y, pos.z)
    sound.setBuffer(buffer)
    sound.setRefDistance(this.opts.refDistance)
    sound.setRolloffFactor(this.opts.rolloffFactor)
    sound.setMaxDistance(this.opts.maxDistance)
    sound.setVolume(volume)

    this.root.add(sound)
    this.activeSounds.add(sound)

    // Force panner world position update trước khi play — tránh frame đầu phát ở origin
    sound.updateWorldMatrix(true, false)

    sound.onEnded = () => {
      try { sound.gain.disconnect() } catch { /* already disconnected */ }
      try { sound.panner.disconnect() } catch { /* already disconnected */ }
      this.root.remove(sound)
      this.activeSounds.delete(sound)
    }

    sound.play()
  }

  private _playAmbient(buffer: AudioBuffer, volume: number): void {
    const sound = new THREE.Audio(this.listener)
    sound.setBuffer(buffer)
    sound.setVolume(volume)

    sound.onEnded = () => {
      try { sound.gain.disconnect() } catch { /* already disconnected */ }
    }

    sound.play()
  }
}
