#!/usr/bin/env node
// find-unused.js — Orphan detector + stale import checker
// Chạy: node find-unused.js
//
// Kiểm tra 3 loại vấn đề:
//   1. Stale imports   — gallery/modules.ts trỏ đến path không tồn tại trên disk
//   2. Unregistered    — có meta.json nhưng không có import nào trong src/
//   3. Orphan files    — file .ts nằm ngoài module folder (không phải index/example/meta/README)

const fs   = require('fs')
const path = require('path')

const ROOT            = __dirname
const MODULES_DIR     = path.join(ROOT, 'threejs-modules')
const SRC_DIR         = path.join(ROOT, '00-Threejs', 'src')

// ─── Helpers ─────────────────────────────────────────────────────────────────

const green  = s => `\x1b[32m${s}\x1b[0m`
const yellow = s => `\x1b[33m${s}\x1b[0m`
const red    = s => `\x1b[31m${s}\x1b[0m`
const dim    = s => `\x1b[2m${s}\x1b[0m`
const bold   = s => `\x1b[1m${s}\x1b[0m`

let totalIssues = 0

function pass(msg)  { console.log(`  ${green('✅')} ${msg}`) }
function warn(msg)  { console.log(`  ${yellow('⚠️ ')} ${msg}`); totalIssues++ }
function fail(msg)  { console.log(`  ${red('❌')} ${msg}`); totalIssues++ }
function info(msg)  { console.log(`  ${dim('ℹ️ ')} ${dim(msg)}`) }

// ─── Scan all modules (supports 2-level: category/module and category/sub/module) ──

function getAllModules() {
  const modules = []
  if (!fs.existsSync(MODULES_DIR)) return modules

  for (const cat of fs.readdirSync(MODULES_DIR).sort()) {
    if (cat.startsWith('_') || cat.startsWith('.')) continue
    const catDir = path.join(MODULES_DIR, cat)
    if (!fs.statSync(catDir).isDirectory()) continue

    for (const entry of fs.readdirSync(catDir).sort()) {
      if (entry.startsWith('_') || entry.startsWith('.')) continue
      const entryPath = path.join(catDir, entry)
      if (!fs.statSync(entryPath).isDirectory()) continue
      if (entry === 'README.md') continue

      const directMeta = path.join(entryPath, 'meta.json')
      if (fs.existsSync(directMeta)) {
        modules.push({ name: entry, cat, fullPath: entryPath, importPath: `${cat}/${entry}` })
        continue
      }
      // Subcategory folder (e.g. shaders/vertex/)
      for (const mod of fs.readdirSync(entryPath).sort()) {
        if (mod.startsWith('_') || mod.startsWith('.')) continue
        const metaPath = path.join(entryPath, mod, 'meta.json')
        if (!fs.existsSync(metaPath)) continue
        modules.push({
          name: mod, cat, sub: entry,
          fullPath: path.join(entryPath, mod),
          importPath: `${cat}/${entry}/${mod}`,
        })
      }
    }
  }
  return modules
}

// ─── Collect all import strings from src/ that reference threejs-modules ─────

function collectSrcImports() {
  const imports = new Set()
  if (!fs.existsSync(SRC_DIR)) return imports

  function walk(dir) {
    for (const f of fs.readdirSync(dir)) {
      const full = path.join(dir, f)
      if (fs.statSync(full).isDirectory()) { walk(full); continue }
      if (!f.endsWith('.ts') && !f.endsWith('.tsx')) continue
      const content = fs.readFileSync(full, 'utf8')
      const re = /['"`]threejs-modules\/([^'"`\s]+)['"`]/g
      let m
      while ((m = re.exec(content)) !== null) imports.add(m[1])
    }
  }
  walk(SRC_DIR)
  return imports
}

// ─── Check 1: Stale imports ───────────────────────────────────────────────────

function checkStaleImports(srcImports) {
  console.log(bold('\n── Check 1: Stale imports (path trong src/ không tồn tại trên disk)'))
  let found = 0

  for (const importedPath of [...srcImports].sort()) {
    const diskPath = path.join(MODULES_DIR, importedPath)
    // importedPath có thể là 'shaders/vertex/WindAnimation/example' — lấy module folder
    const parts     = importedPath.split('/')
    // Module folder = tất cả trừ file cuối cùng nếu không phải subfolder của module
    // Heuristic: nếu phần cuối là 'example', 'index', etc. thì bỏ đi
    const lastPart  = parts[parts.length - 1]
    const knownFiles = ['example', 'index', 'meta', 'README']
    const moduleParts = knownFiles.includes(lastPart) ? parts.slice(0, -1) : parts
    const moduleFolder = path.join(MODULES_DIR, ...moduleParts)

    if (!fs.existsSync(moduleFolder)) {
      fail(`threejs-modules/${importedPath}`)
      info(`  → Không tìm thấy: ${moduleParts.join('/')}`)
      found++
    }
  }

  if (found === 0) pass(`Tất cả ${srcImports.size} import paths tồn tại trên disk`)
}

// ─── Check 2: Unregistered modules ───────────────────────────────────────────

function checkUnregistered(allModules, srcImports) {
  console.log(bold('\n── Check 2: Unregistered modules (có meta.json nhưng không ai import trong src/)'))
  let found = 0

  for (const mod of allModules) {
    // Module được dùng nếu có bất kỳ import nào chứa importPath của nó
    const isImported = [...srcImports].some(p => p.startsWith(mod.importPath))
    if (!isImported) {
      warn(`${mod.importPath}  ${dim(`(${mod.name})`)}`)
      found++
    }
  }

  if (found === 0) pass('Mọi module đều có ít nhất 1 import trong src/')
  else info(`${found} module chưa được dùng trong src/ — có thể là library-only (bình thường) hoặc orphan thực sự`)
}

// ─── Check 3: Orphan files ────────────────────────────────────────────────────

function checkOrphanFiles() {
  console.log(bold('\n── Check 3: Orphan files (.ts nằm ngoài module folder hoặc tên không chuẩn)'))
  const allowed = new Set(['index.ts', 'example.ts', 'meta.json', 'README.md'])
  let found = 0

  function scanDir(dir, depth) {
    for (const f of fs.readdirSync(dir)) {
      if (f.startsWith('_') || f.startsWith('.') || f === 'node_modules') continue
      const full = path.join(dir, f)
      const stat = fs.statSync(full)
      if (stat.isDirectory()) {
        if (depth < 3) scanDir(full, depth + 1)
        continue
      }
      // File at module level (depth=2 for flat, depth=3 for subcategory)
      if (depth >= 2 && !allowed.has(f)) {
        const rel = path.relative(MODULES_DIR, full)
        warn(`Unexpected file: threejs-modules/${rel.replace(/\\/g, '/')}`)
        found++
      }
    }
  }

  scanDir(MODULES_DIR, 0)
  if (found === 0) pass('Không có file nào ngoài chuẩn (index.ts / example.ts / meta.json / README.md)')
}

// ─── Main ─────────────────────────────────────────────────────────────────────

console.log(bold('═══════════════════════════════════════════════════'))
console.log(bold('  find-unused.js — Orphan & Stale Import Detector'))
console.log(bold('═══════════════════════════════════════════════════'))

const allModules = getAllModules()
const srcImports = collectSrcImports()

info(`${allModules.length} modules trong threejs-modules/`)
info(`${srcImports.size} unique import paths trong src/`)

checkStaleImports(srcImports)
checkUnregistered(allModules, srcImports)
checkOrphanFiles()

console.log('')
if (totalIssues === 0) {
  console.log(green(bold('✅ CLEAN — không có orphan hay stale import')))
} else {
  console.log(yellow(bold(`⚠️  ${totalIssues} issue(s) cần review`)))
  console.log(dim('   ❌ = cần fix ngay  |  ⚠️  = review xem có intentional không'))
}
console.log('')
