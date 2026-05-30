/**
 * VỊ TRÍ   — threejs-modules/ui/Tabs/index.ts
 * VAI TRÒ  — Tabs UI thuần DOM (folder-style): tablist ngang, ấn 1 tab → mở tabpanel đó + đóng các
 *             tab khác. ARIA đầy đủ (tablist/tab/tabpanel + aria-selected) + roving tabindex +
 *             điều hướng phím (←/→/↑/↓/Home/End). Framework-agnostic — không phụ thuộc Three.js/lil-gui.
 * LIÊN HỆ  — Tách từ ArchPlanLab buildTabBar (01-Doraemon). Pattern + 2 chìa khoá: memory
 *             nested-tabs-css-template (tách màu self/kids + fix margin-collapse first-child).
 *
 * CÁCH DÙNG: panel phải LÀ CON của host trước khi tạo Tabs (component chèn tablist trước panel đầu).
 *   const tabs = new Tabs(host, panels.map((panel, i) => ({ label: `T${i}`, panel })), { onChange })
 * DISPOSE: gỡ tablist khỏi DOM + abort mọi listener. KHÔNG đụng panel (caller sở hữu, chỉ show/hide).
 */

import { DEFAULT_CSS } from './styles'

export interface TabItem {
  /** Nhãn hiển thị trên nút tab. */
  label: string
  /** Element nội dung — đã nằm trong host; component chỉ show/hide + gắn ARIA (không tạo/huỷ). */
  panel: HTMLElement
  /** Tooltip nút tab (title). */
  title?: string
}

export interface TabsClasses {
  bar: string
  tab: string
  panel: string
  active: string
}

export interface TabsOptions {
  /** Tab mở ban đầu (clamp [0, n-1]). Default 0. */
  initial?: number
  /** Phần tử thêm cuối tablist (vd nút "+"/"open") — KHÔNG phải tab, không vào arrow-nav. */
  addEl?: HTMLElement
  /** Đổi tên class để tự theme. Default bộ 'tabs-*'. */
  classes?: Partial<TabsClasses>
  /** Bơm CSS mặc định (folder-tab look) 1 lần vào <head>. Default true. false = caller tự lo CSS. */
  injectCss?: boolean
  /** Gọi mỗi lần đổi tab (kể cả initial). trusted=false khi do code, true khi user click/phím. */
  onChange?: (index: number, ev: { trusted: boolean }) => void
}

type ChangeCb = (index: number, ev: { trusted: boolean }) => void

const DEFAULT_CLASSES: TabsClasses = { bar: 'tabs-bar', tab: 'tabs-tab', panel: 'tabs-panel', active: 'tabs-active' }
let _uid = 0

export class Tabs {
  private items: TabItem[]
  private cls: TabsClasses
  private onChange?: ChangeCb
  private bar: HTMLElement | null = null
  private btns: HTMLButtonElement[] = []
  private active = 0
  private ac = new AbortController()
  private isDisposed = false

  constructor(host: HTMLElement, items: TabItem[], opts: TabsOptions = {}) {
    this.items = items
    this.cls = { ...DEFAULT_CLASSES, ...opts.classes }
    this.onChange = opts.onChange
    if (opts.injectCss !== false) injectDefaultCss()

    const uid = `tabs-${_uid++}`
    const bar = document.createElement('div')
    bar.className = this.cls.bar
    bar.setAttribute('role', 'tablist')
    this.bar = bar

    items.forEach((it, i) => {
      it.panel.classList.add(this.cls.panel)
      it.panel.setAttribute('role', 'tabpanel')
      it.panel.id = `${uid}-p${i}`
      it.panel.setAttribute('aria-labelledby', `${uid}-t${i}`)
      const btn = document.createElement('button')
      btn.type = 'button'
      btn.className = this.cls.tab
      btn.textContent = it.label
      if (it.title) btn.title = it.title
      btn.setAttribute('role', 'tab')
      btn.id = `${uid}-t${i}`
      btn.setAttribute('aria-controls', `${uid}-p${i}`)
      btn.tabIndex = -1
      btn.addEventListener('click', (e) => this.select(i, { trusted: e.isTrusted }), { signal: this.ac.signal })
      this.btns.push(btn)
      bar.appendChild(btn)
    })
    if (opts.addEl) bar.appendChild(opts.addEl)
    bar.addEventListener('keydown', (e) => this.onKey(e), { signal: this.ac.signal })

    const anchor = items[0]?.panel
    if (anchor && anchor.parentNode === host) host.insertBefore(bar, anchor)
    else host.appendChild(bar) // không có panel trong host → đặt cuối host
    this.select(opts.initial ?? 0, { trusted: false })
  }

  /** Chọn tab idx (clamp). focus=true để dời focus (dùng khi điều hướng phím). */
  select(index: number, opts: { focus?: boolean; trusted?: boolean } = {}): void {
    if (this.isDisposed || this.items.length === 0) return
    const idx = clamp(index, this.items.length)
    this.items.forEach((it, i) => {
      const on = i === idx
      it.panel.style.display = on ? '' : 'none' // ẩn = display:none → screen reader cũng bỏ qua
      const btn = this.btns[i]
      btn.classList.toggle(this.cls.active, on)
      btn.setAttribute('aria-selected', on ? 'true' : 'false')
      btn.tabIndex = on ? 0 : -1 // roving tabindex: chỉ tab active vào tab-order
    })
    this.active = idx
    if (opts.focus) this.btns[idx].focus()
    this.onChange?.(idx, { trusted: opts.trusted ?? false })
  }

  getTablist(): HTMLElement {
    if (!this.bar) throw new Error('Tabs: đã dispose')
    return this.bar
  }

  getActiveIndex(): number {
    return this.active
  }

  dispose(): void {
    if (this.isDisposed) return
    this.ac.abort() // gỡ mọi listener (click + keydown) 1 phát
    this.bar?.parentNode?.removeChild(this.bar)
    this.bar = null
    this.btns = []
    this.items = []
    this.isDisposed = true
  }

  // ARIA Tabs (automatic activation): →/↓ tiến, ←/↑ lùi (cuộn vòng), Home/End đầu/cuối.
  // Focus ngoài tab (nút add) → bỏ qua.
  private onKey(e: KeyboardEvent): void {
    const cur = this.btns.findIndex((b) => b === document.activeElement)
    if (cur < 0) return
    const n = this.btns.length
    let next = cur
    if (e.key === 'ArrowRight' || e.key === 'ArrowDown') next = (cur + 1) % n
    else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') next = (cur - 1 + n) % n
    else if (e.key === 'Home') next = 0
    else if (e.key === 'End') next = n - 1
    else return
    e.preventDefault()
    this.select(next, { focus: true, trusted: true })
  }
}

function clamp(i: number, n: number): number {
  if (n <= 0) return 0
  return i < 0 ? 0 : i >= n ? n - 1 : i
}

const CSS_ID = 'tabs-default-css'
function injectDefaultCss(): void {
  if (typeof document === 'undefined' || document.getElementById(CSS_ID)) return
  const style = document.createElement('style')
  style.id = CSS_ID
  style.textContent = DEFAULT_CSS
  document.head.appendChild(style)
}
