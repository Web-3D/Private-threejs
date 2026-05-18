#!/usr/bin/env node
// validate.js — kiểm tra module sau mỗi bước build
// Usage:
//   node validate.js threejs-modules/shaders/TriplanarMapping
//   node validate.js assets/buildings/xyz  ← delegates to validate-asset.js

const { execSync } = require('child_process')
const crypto = require('crypto')
const fs = require('fs')
const path = require('path')

const MODULE_META_FIELDS = ['name', 'version', 'category', 'description', 'status', 'dependencies']

let errors = 0
function pass(msg) { console.log('  ✅ ' + msg) }
function fail(msg) { console.log('  ❌ ' + msg); errors++ }
function warn(msg) { console.log('  ⚠️  ' + msg) }

// ─── Cache ────────────────────────────────────────────────────────────────────

const CACHE_FILE = path.join(__dirname, '.validate-cache.json')

function hashDir(dirPath) {
  const files = []
  function walk(dir) {
    for (const entry of fs.readdirSync(dir).sort()) {
      const full = path.join(dir, entry)
      if (fs.statSync(full).isDirectory()) walk(full)
      else files.push(full)
    }
  }
  walk(dirPath)
  const h = crypto.createHash('md5')
  for (const f of files) {
    h.update(f.replace(/\\/g, '/'))
    h.update(fs.readFileSync(f))
  }
  return h.digest('hex')
}

function loadCache() {
  try { return JSON.parse(fs.readFileSync(CACHE_FILE, 'utf8')) } catch { return {} }
}
function saveCache(cache) {
  fs.writeFileSync(CACHE_FILE, JSON.stringify(cache, null, 2))
}

// ─── Module validator ─────────────────────────────────────────────────────────

function validateModule(modulePath) {
  // 1. Required files
  for (const file of ['index.ts', 'example.ts', 'meta.json', 'README.md']) {
    if (fs.existsSync(path.join(modulePath, file))) pass(file + ' tồn tại')
    else fail(file + ' thiếu')
  }

  // 2. meta.json fields + local dependency existence
  const metaPath = path.join(modulePath, 'meta.json')
  if (fs.existsSync(metaPath)) {
    let meta
    try {
      meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'))
    } catch (e) {
      fail('meta.json parse lỗi: ' + e.message)
      return
    }

    const missing = MODULE_META_FIELDS.filter(f => !meta[f] && meta[f] !== 0)
    if (missing.length) fail('meta.json thiếu fields: ' + missing.join(', '))
    else pass('Tất cả module meta fields có mặt')

    const localDeps = (Array.isArray(meta.dependencies) ? meta.dependencies : [])
      .filter(dep => /^[A-Z]/.test(dep))
    if (localDeps.length > 0) {
      const tmRoot = modulePath.slice(0, modulePath.indexOf('threejs-modules') + 'threejs-modules'.length)
      const missingDeps = localDeps.filter(dep =>
        !['utils', 'shaders', 'hooks', 'components', 'effects'].some(cat => {
          const catPath = path.join(tmRoot, cat)
          if (fs.existsSync(path.join(catPath, dep))) return true
          if (!fs.existsSync(catPath)) return false
          return fs.readdirSync(catPath).some(sub => {
            const subPath = path.join(catPath, sub)
            return fs.statSync(subPath).isDirectory() && fs.existsSync(path.join(subPath, dep))
          })
        })
      )
      if (missingDeps.length) fail('local dependencies chưa tồn tại: ' + missingDeps.join(', '))
      else pass('Local dependencies tồn tại: ' + localDeps.join(', '))
    }
  }

  // 3. index.ts quality checks
  const indexPath = path.join(modulePath, 'index.ts')
  if (fs.existsSync(indexPath)) {
    const src = fs.readFileSync(indexPath, 'utf8')

    const hasGPU = /new THREE\.(BufferGeometry|ShaderMaterial|RawShaderMaterial|Texture|WebGLRenderTarget)/.test(src)
    if (hasGPU && !/dispose\s*\(\s*\)\s*[:{]/.test(src))
      fail('Có GPU resource nhưng thiếu dispose() method')
    else if (hasGPU)
      pass('dispose() có mặt (GPU resource detected)')

    if (/:\s*any\b/.test(src)) fail('Có dùng TypeScript `any` — vi phạm strict mode')
    else pass('Không có `any` type')

    if (/[^!]!\s*[.[]/.test(src)) warn('Có dùng ! non-null assertion — xem xét lại')
  }

  // 4. TypeScript type check (toàn bộ threejs-modules/)
  const tmIdx = modulePath.indexOf('threejs-modules')
  const modulesRoot = modulePath.slice(0, tmIdx + 'threejs-modules'.length)
  try {
    execSync('npm run type-check', { cwd: modulesRoot, stdio: 'inherit' })
    pass('TypeScript type check: PASS')
  } catch {
    fail('TypeScript type check: FAIL — xem lỗi ở trên')
  }
}

// ─── Main ─────────────────────────────────────────────────────────────────────

const targetArg = process.argv[2]
if (!targetArg) {
  console.log('Usage:')
  console.log('  node validate.js threejs-modules/shaders/TriplanarMapping')
  console.log('  node validate.js assets/buildings/xyz')
  process.exit(0)
}

const resolved = path.resolve(targetArg)
if (!fs.existsSync(resolved)) {
  console.error('❌ Path không tồn tại: ' + resolved)
  process.exit(1)
}

// Assets → delegate hoàn toàn cho validate-asset.js
if (resolved.includes(path.sep + 'assets' + path.sep)) {
  try {
    execSync(
      'node ' + JSON.stringify(path.join(__dirname, 'validate-asset.js')) + ' ' + JSON.stringify(targetArg),
      { stdio: 'inherit' }
    )
  } catch { process.exit(1) }
  process.exit(0)
}

if (!resolved.includes('threejs-modules')) {
  console.error('❌ Path phải chứa "assets/" hoặc "threejs-modules/"')
  process.exit(1)
}

// Cache check
const cache = loadCache()
const cacheKey = resolved.replace(/\\/g, '/')
const currentHash = hashDir(resolved)

if (cache[cacheKey] === currentHash) {
  console.log('\n' + '─'.repeat(55))
  console.log('⚡ CACHED: ' + path.basename(resolved) + ' — không đổi, skip validate')
  console.log('─'.repeat(55) + '\n')
  process.exit(0)
}

console.log('\n' + '─'.repeat(55))
console.log('MODULE CHECK: ' + path.basename(resolved))
console.log('─'.repeat(55))
validateModule(resolved)
console.log('─'.repeat(55))

if (errors === 0) {
  cache[cacheKey] = currentHash
  saveCache(cache)
  execSync('node update-index.js', { cwd: __dirname, stdio: 'pipe' })
  console.log('✅ PASS — đạt chuẩn, có thể chuyển sang bước tiếp theo\n')
  process.exit(0)
} else {
  console.log('❌ FAIL — ' + errors + ' lỗi cần fix trước khi chuyển bước\n')
  process.exit(1)
}
