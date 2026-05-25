# Deferred: LabBase — Reusable Design Lab Template

> Phát hiện từ việc build BuildingLab trong 01-Doraemon.
> Pattern này xuất hiện tự nhiên qua thực hành — không thiết kế từ đầu.
>
> Nguyên tắc: **không abstract sớm** — chờ đến khi có ≥3 Lab cụ thể,
> sau đó extract LabBase. Hiện tại ghi lại pattern để không mất.

---

## Pattern phát hiện từ BuildingLab

`BuildingLab.ts` có 2 phần rõ ràng:

```
Infrastructure (không đổi qua mọi Lab)   Content (đặc thù từng Lab)
─────────────────────────────────────    ────────────────────────────
- Overlay canvas management              - Part types enum
- BaseWorld setup (lights, grid)         - Per-part param objects
- OrbitControls setup                    - Preview builders (_showXxx)
- GUI scaffold + part selector           - GUI folders per part
- _clearParts() + _reg() pattern         - Config JSON schemas
- _save() → Vite middleware              - Ghost wall / context helpers
- Lazy init / dispose on close           - Token casting logic
```

---

## Use cases tương lai — khi nào extract LabBase

| Lab | Content | Tương tự BuildingLab? |
|---|---|---|
| `TerrainLab` | Noise params, height curves, erosion | ✅ GUI + save JSON + preview |
| `VegetationLab` | Tree/grass density, placement radius | ✅ GUI + save JSON + preview |
| `ParticleLab` | Emitter params, lifetime, velocity | ✅ GUI + save JSON + preview |
| `MaterialLab` | TSL shader uniforms, texture params | ✅ GUI + save JSON + preview |
| `LightingLab` | Light positions, intensity, color | ✅ GUI + save JSON + preview |

Khi có ≥3 Lab → extract `LabBase` vào `threejs-modules/utils/lab/`.

---

## LabBase skeleton (khi extract)

```typescript
// threejs-modules/utils/lab/LabBase.ts
// Abstract base — mọi Lab extend class này

export abstract class LabBase extends BaseWorld {
  protected abstract readonly partNames: readonly string[]
  protected activePart!: string

  protected gui: GUI | null = null
  protected controls: OrbitControls | null = null
  protected gridHelper: THREE.GridHelper | null = null
  protected readonly partGroup = new THREE.Group()
  protected partGeos: THREE.BufferGeometry[] = []
  protected partMats: THREE.Material[] = []

  // Subclass implements these 2 methods only
  protected abstract _buildPartFolders(gui: GUI, rb: () => void): Record<string, GUI>
  protected abstract _showPart(partName: string): void

  // Infrastructure — không override
  protected async onInit(): Promise<void> {
    this._setupCommonScene()
    this._setupControls()
    this._buildGui()        // calls _buildPartFolders
    this._rebuildPart()     // calls _showPart
  }

  protected onDispose(): void {
    this.controls?.dispose()
    this.gui?.destroy()
    this.gridHelper?.dispose()
    this._clearParts()
    // null assignments...
  }

  protected _clearParts(): void { /* dispose geos + mats, clear group */ }
  protected _reg(r: PartResult): void { /* register into partGeos/Mats */ }
  protected _rebuildPart(): void { this._clearParts(); this._showPart(this.activePart) }

  protected async _save(file: string, data: object): Promise<void> {
    await fetch(`/__save-config?file=${file}`, {
      method: 'POST', body: JSON.stringify(data, null, 2),
    })
  }
}
```

**BuildingLab sau khi extract:**
```typescript
export class BuildingLab extends LabBase {
  protected readonly partNames = ['wall', 'roof', 'door', 'windows', 'shopfront'] as const
  // chỉ còn: param objects + _buildPartFolders() + _showPart()
  // xóa được: toàn bộ infrastructure boilerplate
}
```

---

## HTML/CSS template — không đổi

```html
<!-- Thêm vào index.html của bất kỳ project nào -->
<button id="[name]-btn">🔬 [Label]</button>
<div id="[name]-overlay">
  <canvas id="[name]-canvas"></canvas>
  <button id="[name]-close">✕ Close</button>
</div>
```

```css
/* Copy từ style.css — không đổi gì */
#[name]-btn    { position: fixed; bottom: 24px; right: 24px; z-index: 50; ... }
#[name]-overlay { display: none; position: fixed; inset: 0; z-index: 100; ... }
#[name]-canvas { position: absolute; inset: 0; width: 100%; height: 100%; ... }
#[name]-close  { position: absolute; top: 16px; left: 16px; z-index: 10; ... }
```

---

## main.ts toggle pattern — không đổi

```typescript
function initLabToggle(): void {
  let lab: [XxxLab] | null = null
  document.querySelector('#[name]-btn')?.addEventListener('click', () => {
    const overlay = document.querySelector<HTMLDivElement>('#[name]-overlay')
    if (!overlay) return
    overlay.style.display = 'block'
    if (lab) return
    const canvas = document.querySelector<HTMLCanvasElement>('#[name]-canvas')
    if (!canvas) return
    lab = new [XxxLab](canvas)
    void lab.init()
  })
  document.querySelector('#[name]-close')?.addEventListener('click', () => {
    document.querySelector<HTMLDivElement>('#[name]-overlay')!.style.display = 'none'
    lab?.dispose(); lab = null
  })
}
```

---

## Vite middleware — 1 lần dùng mãi

Đã generalize trong `vite.config.js` — regex cho phép subpath:
```
/__save-config?file=world/building/parts/wall
/__save-config?file=terrain/noise
/__save-config?file=vegetation/density
```
Không cần sửa gì thêm.

---

## Config JSON workflow — đã proven

```
Lab GUI tweak → 💾 Save → src/[domain]/[name].config.json
                              ↓
                     artistic reference (tay chỉnh, đã verify mắt)
                              ↓
                     khi production-ready → cập nhật TOKENS/constants
```

Pattern này tách biệt **art direction** (Lab) với **production constants** (TOKENS).
Không tự động sync — intentional, tránh accidentally overwrite tuned values.

---

## Khi nào extract

Checklist:
- [ ] Có ≥3 Lab riêng biệt trong project
- [ ] Mỗi Lab copy ≥50% infrastructure từ BuildingLab
- [ ] Có nhu cầu sửa infrastructure ở 1 chỗ → reflect mọi Lab

Chưa đủ điều kiện → giữ nguyên, chỉ copy. Copy < abstract sớm.
