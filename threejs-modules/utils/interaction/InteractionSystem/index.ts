/**
 * VỊ TRÍ  : threejs-modules/utils/InteractionSystem/index.ts
 * VAI TRÒ : Raycaster wrapper — hover/click/pointer events trên 3D mesh
 * LIÊN HỆ : RuntimeGuard (dependency), dùng trong World class có animation loop
 *
 * CÁCH DÙNG:
 *   const system = new InteractionSystem({ camera, canvas: renderer.domElement })
 *   system.add(mesh, { onClick: e => console.log(e.point) })
 *   // trong animation loop:
 *   system.update()
 *   // cleanup:
 *   system.dispose()
 * DISPOSE: remove event listeners, xóa targets map
 */

import { Raycaster, Vector2 } from 'three'
import type * as THREE from 'three'

export interface InteractionEvent {
  object: THREE.Object3D
  point: THREE.Vector3
  distance: number
  originalEvent: MouseEvent
}

export interface InteractionHandlers {
  onClick?: (event: InteractionEvent) => void
  onPointerEnter?: (event: InteractionEvent) => void
  onPointerLeave?: (object: THREE.Object3D) => void
}

export interface InteractionSystemOptions {
  camera: THREE.Camera
  canvas: HTMLElement
  /** Chỉ xét intersection recursive vào children. Default: false */
  recursive?: boolean
}

export class InteractionSystem {
  private raycaster = new Raycaster()
  private pointer = new Vector2()
  private targets = new Map<THREE.Object3D, InteractionHandlers>()
  private hoveredObject: THREE.Object3D | null = null
  private camera: THREE.Camera
  private canvas: HTMLElement
  private recursive: boolean
  private isDisposed = false

  private boundOnMouseMove: (e: MouseEvent) => void
  private boundOnClick: (e: MouseEvent) => void

  constructor(opts: InteractionSystemOptions) {
    this.camera = opts.camera
    this.canvas = opts.canvas
    this.recursive = opts.recursive ?? false

    this.boundOnMouseMove = this.onMouseMove.bind(this)
    this.boundOnClick = this.onClickEvent.bind(this)

    this.canvas.addEventListener('mousemove', this.boundOnMouseMove)
    this.canvas.addEventListener('click', this.boundOnClick)
  }

  /** Đăng ký object là interactive. Có thể gọi nhiều lần với cùng object để update handlers. */
  add(object: THREE.Object3D, handlers: InteractionHandlers): void {
    if (this.isDisposed) return
    this.targets.set(object, handlers)
  }

  /** Huỷ đăng ký object. */
  remove(object: THREE.Object3D): void {
    if (this.hoveredObject === object) {
      this.targets.get(object)?.onPointerLeave?.(object)
      this.hoveredObject = null
    }
    this.targets.delete(object)
  }

  /**
   * Gọi mỗi frame để detect hover (pointerEnter/Leave).
   * Click không cần gọi update — được xử lý qua event listener.
   */
  update(): void {
    if (this.isDisposed || this.targets.size === 0) return

    const objects = Array.from(this.targets.keys())
    this.raycaster.setFromCamera(this.pointer, this.camera)
    const hits = this.raycaster.intersectObjects(objects, this.recursive)

    const topHit = hits[0]
    const hitObject = topHit
      ? // tìm registered target (vì recursive có thể trả về child)
        objects.find(o => o === topHit.object || o.getObjectById(topHit.object.id) !== undefined) ??
        null
      : null

    if (hitObject !== this.hoveredObject) {
      // leave cũ
      if (this.hoveredObject) {
        this.targets.get(this.hoveredObject)?.onPointerLeave?.(this.hoveredObject)
      }
      // enter mới
      if (hitObject && topHit) {
        const handlers = this.targets.get(hitObject)
        handlers?.onPointerEnter?.({
          object: hitObject,
          point: topHit.point,
          distance: topHit.distance,
          originalEvent: new MouseEvent('pointermove'),
        })
      }
      this.hoveredObject = hitObject
    }
  }

  private updatePointer(e: MouseEvent): void {
    const rect = this.canvas.getBoundingClientRect()
    // NDC: (-1, -1) bottom-left → (1, 1) top-right
    this.pointer.x = ((e.clientX - rect.left) / rect.width) * 2 - 1
    this.pointer.y = -((e.clientY - rect.top) / rect.height) * 2 + 1
  }

  private onMouseMove(e: MouseEvent): void {
    this.updatePointer(e)
  }

  private onClickEvent(e: MouseEvent): void {
    if (this.isDisposed || this.targets.size === 0) return
    this.updatePointer(e)

    const objects = Array.from(this.targets.keys())
    this.raycaster.setFromCamera(this.pointer, this.camera)
    const hits = this.raycaster.intersectObjects(objects, this.recursive)

    const topHit = hits[0]
    if (!topHit) return

    const hitObject =
      objects.find(o => o === topHit.object || o.getObjectById(topHit.object.id) !== undefined) ??
      null
    if (!hitObject) return

    this.targets.get(hitObject)?.onClick?.({
      object: hitObject,
      point: topHit.point,
      distance: topHit.distance,
      originalEvent: e,
    })
  }

  dispose(): void {
    if (this.isDisposed) return
    this.canvas.removeEventListener('mousemove', this.boundOnMouseMove)
    this.canvas.removeEventListener('click', this.boundOnClick)
    this.targets.clear()
    this.hoveredObject = null
    this.isDisposed = true
  }
}
