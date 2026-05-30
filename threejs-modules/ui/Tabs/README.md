# Tabs

Tabs UI **thuần DOM** (folder-style) — framework-agnostic, không phụ thuộc Three.js/lil-gui.
Ấn 1 tab trong hàng ngang → mở tabpanel đó + đóng các tab khác. Có sẵn **ARIA chuẩn** + **điều
hướng phím**. Tách từ tab system của ArchPlanLab.

## Tính năng

- **ARIA Tabs đầy đủ**: `role=tablist/tab/tabpanel`, `aria-selected`, liên kết 2 chiều
  `aria-controls`/`aria-labelledby`.
- **Roving tabindex**: chỉ tab active vào tab-order (Tab vào là nhảy đúng tab đang mở).
- **Keyboard nav** (automatic activation): `←`/`↑` lùi, `→`/`↓` tiến (cuộn vòng), `Home`/`End`
  đầu/cuối → chuyển tab + focus.
- **Folder-tab look**: tab active dính liền panel (border-bottom trong suốt + `margin-bottom:-1px`).
- **Theme qua CSS vars** hoặc đổi tên class. Hỗ trợ **nút add** cuối hàng (không phải tab).
- `dispose()` gỡ tablist + abort mọi listener (1 phát qua AbortController).

## Usage

```typescript
import { Tabs } from 'threejs-modules/ui/Tabs'

// Panel phải LÀ CON của host TRƯỚC khi tạo Tabs (component chèn tablist trước panel đầu).
const host = document.querySelector('#panel')!
const panels = [...host.querySelectorAll('.content')] as HTMLElement[]

const tabs = new Tabs(
  host,
  panels.map((panel, i) => ({ label: `Tab ${i + 1}`, panel })),
  {
    initial: 0,
    onChange: (i, ev) => console.log('đổi sang tab', i, ev.trusted ? '(user)' : '(init)'),
  }
)

tabs.select(2)            // chuyển tab bằng code
tabs.getActiveIndex()     // → 2
tabs.dispose()            // dọn dẹp
```

## Options

| Option      | Type                          | Default  | Description |
| ----------- | ----------------------------- | -------- | ----------- |
| `initial`   | `number`                      | `0`      | Tab mở ban đầu (clamp) |
| `addEl`     | `HTMLElement`                 | —        | Phần tử cuối tablist (nút +/open) — không phải tab |
| `classes`   | `Partial<TabsClasses>`        | `tabs-*` | Đổi tên class `bar/tab/panel/active` để tự theme |
| `injectCss` | `boolean`                     | `true`   | Bơm CSS mặc định 1 lần; `false` = caller tự lo CSS |
| `onChange`  | `(i, {trusted}) => void`      | —        | Mỗi lần đổi tab; `trusted=true` khi user, `false` khi initial/code |

## Theming

Đổi CSS custom props (khi dùng CSS mặc định):

```css
.my-panel {
  --tabs-tab-bg: #c9d2d0;     /* nền tab thường */
  --tabs-panel-bg: #ffffff;   /* nền panel + tab active (dính) */
  --tabs-border: rgba(0,0,0,.25);
  --tabs-tab-color: #1a2b27;
}
```

Hoặc `injectCss: false` + truyền `classes` của riêng bạn → tự viết toàn bộ style.

### Tab lồng tab (nested) — màu sâu dần

Component lo cấu trúc + hành vi; **màu theo độ sâu** do CSS consumer set. Mỗi cấp set lại
`--tabs-panel-bg`/`--tabs-tab-bg` sáng/tối hơn. Chìa khoá: tab active = màu panel **con** nó mở ra
(không phải panel chứa nó) — xem cách ArchPlanLab tách `--ap-bg`/`--ap-kids-bg`.

## Dispose

```typescript
tabs.dispose() // gỡ tablist khỏi DOM + abort listener. KHÔNG đụng panel (caller sở hữu).
```
