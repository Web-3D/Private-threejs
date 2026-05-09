#!/usr/bin/env node
// check-imports.js — Đảm bảo 00-Threejs/src/ chỉ import từ assets/*/production/
// Usage: node check-imports.js

const fs = require('fs')
const path = require('path')

const ROOT = __dirname
const SRC_DIR = path.join(ROOT, '00-Threejs', 'src')

let errors = 0

function pass(msg) { console.log(`  ✅ ${msg}`) }
function fail(msg) { console.log(`  ❌ ${msg}`); errors++ }

function scanFile(filePath) {
  const content = fs.readFileSync(filePath, 'utf8')
  const rel = path.relative(ROOT, filePath)

  content.split('\n').forEach((line, i) => {
    if (/import.*['"].*[/\\]raw[/\\]/.test(line) || /from\s+['"].*\/raw\//.test(line)) {
      fail(`${rel}:${i + 1} — import từ raw/ bị cấm (phải dùng production/)`)
    }
    if (/import.*['"].*[/\\]optimized[/\\]/.test(line) || /from\s+['"].*\/optimized\//.test(line)) {
      fail(`${rel}:${i + 1} — import từ optimized/ bị cấm (phải dùng production/)`)
    }
  })
}

function scanDir(dir) {
  if (!fs.existsSync(dir)) return
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    const full = path.join(dir, entry.name)
    if (entry.isDirectory()) {
      scanDir(full)
    } else if (entry.name.endsWith('.ts') || entry.name.endsWith('.js')) {
      scanFile(full)
    }
  }
}

console.log('\n' + '─'.repeat(55))
console.log('IMPORT CHECK: 00-Threejs/src/')
console.log('─'.repeat(55))

if (!fs.existsSync(SRC_DIR)) {
  console.log('  ⚠️  00-Threejs/src/ không tồn tại — bỏ qua')
  process.exit(0)
}

scanDir(SRC_DIR)

if (errors === 0) pass('Không có import vi phạm — chỉ dùng production/')

console.log('─'.repeat(55))
if (errors === 0) {
  console.log('✅ PASS\n')
  process.exit(0)
} else {
  console.log(`❌ FAIL — ${errors} import vi phạm cần fix\n`)
  process.exit(1)
}
