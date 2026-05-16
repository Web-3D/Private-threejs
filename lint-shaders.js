#!/usr/bin/env node
// lint-shaders.js — TSL/GLSL policy enforcer cho shaders/ và effects/
// Chạy: node lint-shaders.js
//
// Kiểm tra 4 vi phạm policy (từ CLAUDE.md):
//   1. ShaderMaterial    — phải dùng NodeMaterial thay thế (WebGPU/TSL first)
//   2. Inline GLSL       — không được có GLSL string dài inline; phải tách .glsl hoặc dùng TSL
//   3. console.log       — không được có trong update() / animation loop
//   4. Incomplete module — thiếu README.md hoặc example.ts

const fs   = require('fs')
const path = require('path')

const ROOT        = __dirname
const MODULES_DIR = path.join(ROOT, 'threejs-modules')
const SCAN_CATS   = ['shaders', 'effects']

// ─── Helpers ─────────────────────────────────────────────────────────────────

const green  = s => `\x1b[32m${s}\x1b[0m`
const yellow = s => `\x1b[33m${s}\x1b[0m`
const red    = s => `\x1b[31m${s}\x1b[0m`
const dim    = s => `\x1b[2m${s}\x1b[0m`
const bold   = s => `\x1b[1m${s}\x1b[0m`
const cyan   = s => `\x1b[36m${s}\x1b[0m`

let totalIssues = 0

function pass(msg)  { console.log(`  ${green('✅')} ${msg}`) }
function warn(msg)  { console.log(`  ${yellow('⚠️ ')} ${msg}`); totalIssues++ }
function fail(msg)  { console.log(`  ${red('❌')} ${msg}`); totalIssues++ }
function info(msg)  { console.log(`  ${dim('ℹ️ ')} ${dim(msg)}`) }

// ─── Collect all module folders across shaders/ and effects/ ─────────────────

function getModuleFolders() {
  const folders = []

  for (const cat of SCAN_CATS) {
    const catDir = path.join(MODULES_DIR, cat)
    if (!fs.existsSync(catDir)) continue

    for (const entry of fs.readdirSync(catDir).sort()) {
      if (entry.startsWith('_') || entry.startsWith('.')) continue
      const entryPath = path.join(catDir, entry)
      if (!fs.statSync(entryPath).isDirectory()) continue
      if (entry === 'README.md') continue

      // Direct module
      if (fs.existsSync(path.join(entryPath, 'meta.json'))) {
        folders.push({ label: `${cat}/${entry}`, dir: entryPath })
        continue
      }
      // Subcategory (shaders/vertex/, shaders/fragment/, etc.)
      for (const mod of fs.readdirSync(entryPath).sort()) {
        if (mod.startsWith('_') || mod.startsWith('.')) continue
        const modPath = path.join(entryPath, mod)
        if (fs.statSync(modPath).isDirectory() && fs.existsSync(path.join(modPath, 'meta.json'))) {
          folders.push({ label: `${cat}/${entry}/${mod}`, dir: modPath })
        }
      }
    }
  }
  return folders
}

// ─── Linters ─────────────────────────────────────────────────────────────────

// Check 1: ShaderMaterial usage
function lintShaderMaterial(content, label) {
  const lines = content.split('\n')
  const hits  = []
  lines.forEach((line, i) => {
    if (/new\s+(?:THREE\.)?ShaderMaterial\b/.test(line)) hits.push(i + 1)
  })
  if (hits.length > 0) {
    fail(`[${label}] ShaderMaterial dùng ở dòng ${hits.join(', ')} — đổi sang NodeMaterial`)
    info('NodeMaterial + TSL là standard của project (WebGPU/WebGL2 cross-backend)')
  }
}

// Check 2: Inline GLSL strings
// Dấu hiệu: template literal chứa void main / gl_Position / gl_FragColor / varying / uniform (GLSL keyword)
const GLSL_MARKERS = /void\s+main\s*\(|gl_Position\b|gl_FragColor\b|gl_FragData\b|\bvarying\b|\buniform\b\s+\w+\s+\w+\s*;/

function lintInlineGLSL(content, label) {
  // Tìm template literals (backtick strings) dài > 80 chars chứa GLSL markers
  const re = /`([^`]{80,})`/gs
  let m
  while ((m = re.exec(content)) !== null) {
    if (GLSL_MARKERS.test(m[1])) {
      const lineNo = content.slice(0, m.index).split('\n').length
      fail(`[${label}] Inline GLSL string tại dòng ~${lineNo} — tách ra file .glsl hoặc dùng TSL`)
      info('Rule: GLSL inline string bị cấm. Dùng TSL node graph hoặc import shader.glsl?raw')
      return
    }
  }
}

// Check 3: console.log trong update() / animation loop
// Heuristic: console.log nằm trong hàm tên update / animate / tick / loop
function lintConsoleInUpdate(content, label) {
  // Extract function bodies named update / animate / tick / onFrame
  const fnRe = /(?:update|animate|tick|onFrame)\s*\([^)]*\)\s*(?::\s*\w+\s*)?\{/g
  let m
  while ((m = fnRe.exec(content)) !== null) {
    // Tìm closing brace của function (đơn giản: lấy đến brace depth 0)
    let depth = 0
    let start = m.index + m[0].length - 1 // vị trí của '{'
    let end   = start
    for (let i = start; i < content.length; i++) {
      if (content[i] === '{') depth++
      else if (content[i] === '}') { depth--; if (depth === 0) { end = i; break } }
    }
    const body = content.slice(start, end)
    if (/console\.(log|warn|error|debug)/.test(body)) {
      const lineNo = content.slice(0, m.index).split('\n').length
      warn(`[${label}] console.log trong update() tại dòng ~${lineNo} — xóa trước khi production`)
      info('console.log trong animation loop chạy 60fps → spam DevTools')
    }
  }
}

// Check 4: Incomplete module (thiếu README hoặc example)
function lintIncomplete(modDir, label) {
  const missing = []
  if (!fs.existsSync(path.join(modDir, 'README.md')))  missing.push('README.md')
  if (!fs.existsSync(path.join(modDir, 'example.ts'))) missing.push('example.ts')
  if (missing.length > 0) {
    warn(`[${label}] Thiếu: ${missing.join(', ')}`)
  }
}

// ─── Scan một module ──────────────────────────────────────────────────────────

function lintModule({ label, dir }) {
  const indexPath = path.join(dir, 'index.ts')
  if (!fs.existsSync(indexPath)) {
    warn(`[${label}] index.ts không tồn tại`)
    return
  }

  const content = fs.readFileSync(indexPath, 'utf8')
  lintShaderMaterial(content, label)
  lintInlineGLSL(content, label)
  lintConsoleInUpdate(content, label)
  lintIncomplete(dir, label)
}

// ─── Main ─────────────────────────────────────────────────────────────────────

console.log(bold('═══════════════════════════════════════════════════'))
console.log(bold('  lint-shaders.js — TSL/GLSL Policy Enforcer'))
console.log(bold('═══════════════════════════════════════════════════'))

const modules = getModuleFolders()
info(`Scanning ${modules.length} modules trong: ${SCAN_CATS.join(', ')}`)

const issuesBefore = totalIssues

// Lint từng module, nhóm output theo category
let currentCat = ''
for (const mod of modules) {
  const cat = mod.label.split('/')[0]
  if (cat !== currentCat) {
    console.log(cyan(bold(`\n── ${cat}/`)))
    currentCat = cat
  }
  const issuesBefore2 = totalIssues
  lintModule(mod)
  if (totalIssues === issuesBefore2) {
    pass(mod.label)
  }
}

console.log('')
if (totalIssues === 0) {
  console.log(green(bold('✅ CLEAN — không có vi phạm TSL/GLSL policy')))
} else {
  console.log(red(bold(`❌ ${totalIssues} vi phạm cần fix`)))
  process.exitCode = 1
}
console.log('')
