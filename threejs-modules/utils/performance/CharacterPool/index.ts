/**
 * VỊ TRÍ   — threejs-modules/utils/CharacterPool/index.ts
 * VAI TRÒ  — Generic object pool: pre-allocate slots, acquire/release không tạo mới GPU resource
 * LIÊN HỆ  — Dùng cho crowd (LODBillboard, VATShader mesh); RuntimeGuard pattern cho warnThreshold
 *
 * CÁCH DÙNG:
 *   const pool = new CharacterPool({ factory: () => new Mesh(geo, mat), poolSize: 50 })
 *   const slot = pool.acquire()          // lấy từ pool (null nếu cạn)
 *   if (slot) { slot.position.set(...); scene.add(slot) }
 *   pool.release(slot); scene.remove(slot)  // trả lại pool
 *   pool.dispose()
 *
 * DISPOSE: gọi disposer(item) cho mọi slot nếu được cung cấp — caller cũng nên dispose geometry/material riêng
 */

import type * as THREE from 'three'

export interface CharacterPoolOptions<T extends THREE.Object3D> {
  /** Factory để tạo một slot — gọi đúng poolSize lần khi khởi tạo */
  factory: () => T
  /** Tổng số slot pre-allocated */
  poolSize: number
  /**
   * Cảnh báo khi (active / total) vượt ngưỡng này [0–1].
   * Tương tự RuntimeGuard.check() nhưng theo pool utilization. Default: 0.9
   */
  warnThreshold?: number
  /** Gọi khi dispose() xóa từng slot — cleanup geometry/material bên trong */
  disposer?: (item: T) => void
}

export class CharacterPool<T extends THREE.Object3D> {
  private free: T[]
  private readonly active: Set<T> = new Set()
  private readonly warnThreshold: number
  private readonly disposer: ((item: T) => void) | undefined
  private isDisposed = false

  constructor(opts: CharacterPoolOptions<T>) {
    this.warnThreshold = opts.warnThreshold ?? 0.9
    this.disposer = opts.disposer
    // Pre-allocate tất cả slots ngay trong constructor — zero allocation sau đó
    this.free = Array.from({ length: opts.poolSize }, opts.factory)
  }

  /**
   * Lấy một slot từ pool.
   * Trả về null nếu pool cạn — caller phải handle trường hợp này.
   * Caller chịu trách nhiệm scene.add() và positioning.
   */
  acquire(): T | null {
    if (this.isDisposed) return null
    const item = this.free.pop()
    if (item === undefined) {
      console.warn('[CharacterPool] Pool exhausted — ' + this.active.size + ' slots active, 0 free')
      return null
    }
    this.active.add(item)
    const total = this.active.size + this.free.length
    const utilization = this.active.size / total
    if (utilization >= this.warnThreshold) {
      console.warn(
        '[CharacterPool] High utilization: ' + this.active.size + '/' + total +
        ' (' + Math.round(utilization * 100) + '%)'
      )
    }
    return item
  }

  /**
   * Trả slot về pool.
   * Caller phải gọi scene.remove() trước — pool không quản lý scene.
   */
  release(item: T): void {
    if (this.isDisposed) return
    if (!this.active.has(item)) return
    this.active.delete(item)
    this.free.push(item)
  }

  /** Số slot đang active (trong scene) */
  getActiveCount(): number {
    return this.active.size
  }

  /** Số slot free (trong pool, chờ acquire) */
  getFreeCount(): number {
    return this.free.length
  }

  /** Tổng số slot (active + free) — không đổi sau constructor */
  getPoolSize(): number {
    return this.active.size + this.free.length
  }

  dispose(): void {
    if (this.isDisposed) return
    for (const item of this.active) {
      item.parent?.remove(item)
      this.disposer?.(item)
    }
    for (const item of this.free) {
      this.disposer?.(item)
    }
    this.active.clear()
    this.free = []
    this.isDisposed = true
  }
}
