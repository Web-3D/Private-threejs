/**
 * VỊ TRÍ   — threejs-modules/ui/Tabs/example.ts
 * VAI TRÒ  — Demo standalone Tabs (chạy trong browser, KHÔNG cần Three.js).
 * LIÊN HỆ  — Import Tabs từ ./index. Minh hoạ: panel là con của host trước khi tạo Tabs + nút add.
 */

import { Tabs } from './index'

const host = document.createElement('div')
host.style.width = '320px'
document.body.appendChild(host)

// Panels phải là CON của host TRƯỚC khi tạo Tabs (component chèn tablist trước panel đầu).
const panels = ['A', 'B', 'C'].map((t) => {
  const p = document.createElement('div')
  p.textContent = `Nội dung Tab ${t}`
  host.appendChild(p)
  return p
})

const addBtn = document.createElement('button')
addBtn.type = 'button'
addBtn.textContent = '+'
addBtn.addEventListener('click', () => console.log('add tab'))

const tabs = new Tabs(
  host,
  panels.map((panel, i) => ({ label: `Tab ${i + 1}`, panel })),
  {
    initial: 0,
    addEl: addBtn,
    onChange: (i, ev) => console.log(`→ tab ${i}`, ev.trusted ? '(user)' : '(init)'),
  }
)

console.log('Tabs active =', tabs.getActiveIndex())
// Khi gỡ demo: tabs.dispose()
