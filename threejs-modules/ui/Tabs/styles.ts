/**
 * VỊ TRÍ   — threejs-modules/ui/Tabs/styles.ts
 * VAI TRÒ  — CSS mặc định (folder-style) cho Tabs, bơm 1 lần vào <head> khi injectCss !== false.
 * LIÊN HỆ  — Dùng bởi index.ts (injectDefaultCss). Theme qua CSS custom props --tabs-*.
 *
 * NESTING (tab lồng tab): set lại --tabs-panel-bg / --tabs-tab-bg theo từng cấp ở CSS consumer
 * để màu sáng/tối dần — xem pattern depth của ArchPlanLab (memory nested-tabs-css-template).
 */
export const DEFAULT_CSS = `
.tabs-bar { display: flex; gap: 2px; padding: 4px 4px 0; flex-wrap: nowrap; }
.tabs-tab {
  appearance: none;
  border: 1px solid var(--tabs-border, rgba(0, 0, 0, 0.25));
  border-bottom: none;
  border-radius: 6px 6px 0 0;
  background: var(--tabs-tab-bg, #c9d2d0);
  color: var(--tabs-tab-color, #1a2b27);
  padding: 3px 12px;
  font: inherit;
  line-height: 1.4;
  cursor: pointer;
}
.tabs-tab:hover { background: var(--tabs-tab-hover, #b7c2bf); }
.tabs-tab[aria-selected='true'] {
  background: var(--tabs-panel-bg, #ffffff);
  margin-bottom: -1px;
  position: relative;
  z-index: 1;
}
.tabs-tab:focus-visible { outline: 2px solid var(--tabs-focus, #4a90d9); outline-offset: -2px; }
.tabs-panel {
  background: var(--tabs-panel-bg, #ffffff);
  border: 1px solid var(--tabs-border, rgba(0, 0, 0, 0.25));
  padding: 10px;
}
`
