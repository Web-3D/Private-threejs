/**
 * VỊ TRÍ   — threejs-modules/components/SubdivideDisplaceWall/index.ts
 * VAI TRÒ  — Tường gạch bằng SUBDIVIDE PLANE + VERTEX DISPLACE: 1 plane chia lưới mịn, đẩy đỉnh
 *             Z theo pattern gạch (gạch lồi, vữa lõm) → 1 mặt liền, KHÔNG box rời.
 * LIÊN HỆ  — So sánh với InstancedBrickWall (box instanced). Dùng material 'brick-disp' trong ArchPlanLab.
 *
 * KHÁC InstancedBrickWall:
 *   - 1 mesh liền (đỉnh dùng chung) thay vì vạn box → bo cạnh MỀM tự nhiên (computeVertexNormals
 *     làm tròn bậc), hợp gạch cũ/phong hoá; instanced cho cạnh SẮC/mới.
 *   - Triangle = segX·segY·2 — TỰ CHỌN qua subdivPerBrick → LOD dễ (giảm chia = nhẹ ngay).
 *   - Hợp height-MAP (Megascans) sau này: chỉ thay hàm displace bằng sample texture.
 *   - Yếu: muốn bậc SẮC như box phải chia rất mịn → tris cao; chia thưa thì bị "mềm/nhoè".
 *
 * DISPOSE: backing + skin geo/mat — gọi dispose() khi gỡ tường.
 */

import * as THREE from 'three'

export interface SubdivideDisplaceWallOptions {
  width: number // m
  height: number // m
  depth?: number // m — nền sau (solidity). Default 0.1
  brickL?: number // m. Default 0.215
  brickH?: number // m. Default 0.065
  joint?: number // m. Default 0.01
  brickProtrude?: number // m — gạch lồi khỏi vữa. Default 0.012
  subdivPerBrick?: number // số chia lưới / 1 viên (mỗi trục). Cao = bậc sắc nhưng nhiều tris. Default 3
  brickColor?: THREE.ColorRepresentation // Default 0xb86042
  mortarColor?: THREE.ColorRepresentation // Default 0xc7c4be
  colorVariation?: number // jitter sáng/tối từng viên [0-1]. Default 0.12
}

export class SubdivideDisplaceWall {
  private group: THREE.Group | null = null
  private backingGeo: THREE.BoxGeometry | null = null
  private backingMat: THREE.MeshStandardMaterial | null = null
  private skinGeo: THREE.PlaneGeometry | null = null
  private skinMat: THREE.MeshStandardMaterial | null = null
  private triCount = 0
  private isDisposed = false

  constructor(opts: SubdivideDisplaceWallOptions) {
    const depth = opts.depth ?? 0.1
    const brickL = opts.brickL ?? 0.215
    const brickH = opts.brickH ?? 0.065
    const joint = opts.joint ?? 0.01
    const protrude = opts.brickProtrude ?? 0.012
    const sub = Math.max(1, opts.subdivPerBrick ?? 3)

    const group = new THREE.Group()
    this._buildBacking(group, opts.width, opts.height, depth, opts.mortarColor ?? 0xc7c4be)
    this._buildSkin(group, opts, { depth, brickL, brickH, joint, protrude, sub })
    this.group = group
  }

  getGroup(): THREE.Group {
    if (!this.group) throw new Error('SubdivideDisplaceWall: đã dispose')
    return this.group
  }

  /** Tổng triangle (skin lưới + nền 12). */
  getTriangleCount(): number {
    return this.triCount + 12
  }

  dispose(): void {
    if (this.isDisposed) return
    this.group?.parent?.remove(this.group)
    this.backingGeo?.dispose()
    this.backingMat?.dispose()
    this.skinGeo?.dispose()
    this.skinMat?.dispose()
    this.group = null
    this.backingGeo = null
    this.backingMat = null
    this.skinGeo = null
    this.skinMat = null
    this.isDisposed = true
  }

  // ── Private ────────────────────────────────────────────────────────────────

  private _buildBacking(
    group: THREE.Group,
    w: number,
    h: number,
    depth: number,
    mortarColor: THREE.ColorRepresentation
  ): void {
    this.backingGeo = new THREE.BoxGeometry(w, h, depth)
    this.backingMat = new THREE.MeshStandardMaterial({ color: mortarColor, roughness: 0.95 })
    const mesh = new THREE.Mesh(this.backingGeo, this.backingMat)
    mesh.position.set(0, h / 2, 0)
    mesh.castShadow = true
    mesh.receiveShadow = true
    group.add(mesh)
  }

  // Skin = PlaneGeometry chia (segX×segY), đẩy đỉnh Z theo pattern gạch + tô màu gạch/vữa per-vertex.
  // computeVertexNormals → bậc gạch được làm TRÒN mềm (đỉnh dùng chung) = đặc trưng cách này.
  private _buildSkin(
    group: THREE.Group,
    opts: SubdivideDisplaceWallOptions,
    p: { depth: number; brickL: number; brickH: number; joint: number; protrude: number; sub: number }
  ): void {
    const w = opts.width
    const h = opts.height
    const pitchX = p.brickL + p.joint
    const pitchY = p.brickH + p.joint
    const segX = Math.max(1, Math.round((w / pitchX) * p.sub))
    const segY = Math.max(1, Math.round((h / pitchY) * p.sub))
    this.triCount = segX * segY * 2

    const geo = new THREE.PlaneGeometry(w, h, segX, segY) // XY, tâm gốc, normal +Z
    const pos = geo.attributes.position
    const baseZ = p.depth / 2 + 0.001 // ngay trước mặt nền (tránh z-fight)
    const brick = new THREE.Color(opts.brickColor ?? 0xb86042)
    const mortar = new THREE.Color(opts.mortarColor ?? 0xc7c4be)
    const variation = opts.colorVariation ?? 0.12
    const colors = new Float32Array(pos.count * 3)
    const c = new THREE.Color()

    for (let i = 0; i < pos.count; i++) {
      const xl = pos.getX(i) + w / 2 // 0..w từ trái
      const yl = pos.getY(i) + h / 2 // 0..h từ chân
      const hb = this._brickHeight(xl, yl, pitchX, pitchY, p.joint) // 1 gạch / 0 vữa
      pos.setZ(i, baseZ + hb.is * p.protrude)
      if (hb.is > 0) {
        const j = 1 + (this._hash(hb.col, hb.row) - 0.5) * 2 * variation
        c.copy(brick).multiplyScalar(j)
      } else {
        c.copy(mortar)
      }
      colors[i * 3] = c.r
      colors[i * 3 + 1] = c.g
      colors[i * 3 + 2] = c.b
    }
    pos.needsUpdate = true
    geo.setAttribute('color', new THREE.BufferAttribute(colors, 3))
    geo.computeVertexNormals()

    this.skinGeo = geo
    this.skinMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.9 })
    const mesh = new THREE.Mesh(geo, this.skinMat)
    mesh.position.set(0, h / 2, 0)
    mesh.castShadow = true
    mesh.receiveShadow = true
    group.add(mesh)
  }

  // Pattern running-bond: vữa ở dải [0,joint] mỗi ô; gạch khi cả 2 trục qua joint. col/row để hash màu.
  private _brickHeight(
    xl: number,
    yl: number,
    pitchX: number,
    pitchY: number,
    joint: number
  ): { is: number; col: number; row: number } {
    const row = Math.floor(yl / pitchY)
    const off = (row % 2) * (pitchX / 2)
    const sx = xl + off
    const lx = ((sx % pitchX) + pitchX) % pitchX
    const ly = ((yl % pitchY) + pitchY) % pitchY
    const is = lx > joint && ly > joint ? 1 : 0
    return { is, col: Math.floor(sx / pitchX), row }
  }

  private _hash(x: number, y: number): number {
    const s = Math.sin(x * 127.1 + y * 311.7) * 43758.5453
    return s - Math.floor(s)
  }
}
