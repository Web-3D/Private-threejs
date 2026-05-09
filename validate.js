#!/usr/bin/env node
// validate.js — double-check asset hoặc module sau mỗi tiến trình
// Usage:
//   node validate.js assets/buildings/quan-ca-phe
//   node validate.js threejs-modules/shaders/TriplanarMapping

const { execSync } = require('child_process')
const fs = require('fs')
const path = require('path')

// ─── Budget table (từ ARCHITECTURE.md) ───────────────────────────────────────

const BUDGET = {
  buildings: { tris: 5000,  texturePx: 2048 },
  props:      { tris: 500,   texturePx: 512  },
  characters: { tris: 30000, texturePx: 2048 },
}

// ─── Required meta.json fields per category ───────────────────────────────────

const META_FIELDS = {
  buildings:    ['name', 'category', 'source-tool', 'status', 'description', 'created'],
  props:        ['name', 'category', 'source-tool', 'status', 'description', 'created'],
  characters:   ['name', 'category', 'source-tool', 'status', 'description', 'created', 'rig', 'animations'],
  environments: ['name', 'category', 'source-tool', 'status', 'description', 'created', 'format'],
  textures:     ['name', 'category', 'source', 'resolution', 'maps', 'format', 'license'],
}

const MODULE_META_FIELDS = ['name', 'version', 'category', 'description', 'status']

// ─── Helpers ──────────────────────────────────────────────────────────────────

let errors = 0

function pass(msg) { console.log(`  ✅ ${msg}`) }
function fail(msg) { console.log(`  ❌ ${msg}`); errors++ }
function warn(msg) { console.log(`  ⚠️  ${msg}`) }

// ─── Asset validator ──────────────────────────────────────────────────────────

function validateAsset(assetPath) {
  // 1. meta.json tồn tại
  const metaPath = path.join(assetPath, 'meta.json')
  if (!fs.existsSync(metaPath)) {
    fail('meta.json không tồn tại')
    return
  }
  pass('meta.json tồn tại')

  // 2. Parse meta.json
  let meta
  try {
    meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'))
    pass('meta.json hợp lệ JSON')
  } catch (e) {
    fail(`meta.json parse lỗi: ${e.message}`)
    return
  }

  const category = meta.category
  const folderName = path.basename(assetPath)

  // 3. Required fields theo category
  const required = META_FIELDS[category] || META_FIELDS.buildings
  const missing = required.filter(f => meta[f] === undefined || meta[f] === null || meta[f] === '')
  if (missing.length) {
    fail(`meta.json thiếu fields: ${missing.join(', ')}`)
  } else {
    pass('Tất cả required fields có mặt')
  }

  // 4. Tên folder kebab-case
  if (/^[a-z0-9]+(-[a-z0-9]+)*$/.test(folderName)) {
    pass(`Tên folder kebab-case hợp lệ`)
  } else {
    fail(`Tên folder không đúng kebab-case: "${folderName}"`)
  }

  // 5. meta.name khớp tên folder
  if (meta.name && meta.name !== folderName) {
    fail(`meta.name "${meta.name}" không khớp tên folder "${folderName}"`)
  } else if (meta.name) {
    pass('meta.name khớp tên folder')
  }

  // 6. Status hợp lệ
  const validStatuses = ['raw', 'optimized', 'production']
  if (!validStatuses.includes(meta.status)) {
    fail(`status "${meta.status}" không hợp lệ — phải là: ${validStatuses.join(' / ')}`)
  } else {
    pass(`status "${meta.status}" hợp lệ`)

    // 7. Folder tương ứng với status phải tồn tại
    if (!fs.existsSync(path.join(assetPath, meta.status))) {
      fail(`Folder ${meta.status}/ không tồn tại (status khai báo là "${meta.status}")`)
    } else {
      pass(`Folder ${meta.status}/ tồn tại`)
    }
  }

  // 8. production/ phải có file nếu tồn tại
  const prodPath = path.join(assetPath, 'production')
  if (fs.existsSync(prodPath)) {
    const files = fs.readdirSync(prodPath).filter(f => !f.startsWith('.'))
    if (files.length === 0) {
      fail('production/ folder rỗng — chưa có file browser-ready')
    } else {
      pass(`production/ có ${files.length} file: ${files.join(', ')}`)
    }
  }

  // 9. environments không được có optimized/
  if (category === 'environments' && fs.existsSync(path.join(assetPath, 'optimized'))) {
    fail('environments không cần optimized/ — splat không qua Blender MCP')
  }

  // 10. Budget check (đọc từ meta.json, không cần parse GLB)
  const budget = BUDGET[category]
  if (budget && meta.polycount?.production) {
    const tris = meta.polycount.production
    if (tris > budget.tris) {
      fail(`Polycount production ${tris.toLocaleString()} vượt budget ${budget.tris.toLocaleString()} (${category})`)
    } else {
      pass(`Polycount ${tris.toLocaleString()} trong budget (limit: ${budget.tris.toLocaleString()})`)
    }
  } else if (budget && category !== 'environments' && category !== 'textures') {
    warn('polycount.production chưa điền — bỏ qua budget check')
  }

  // 11. texture-size check
  if (meta['texture-size']) {
    const px = parseInt(meta['texture-size'].split('x')[0])
    const limit = budget?.texturePx || 2048
    if (px > limit) {
      fail(`texture-size ${meta['texture-size']} vượt limit ${limit}×${limit} (${category})`)
    } else {
      pass(`texture-size ${meta['texture-size']} trong budget`)
    }
  }

  // 12. created date format
  if (meta.created && !/^\d{4}-\d{2}-\d{2}$/.test(meta.created)) {
    fail(`created "${meta.created}" sai format — phải là YYYY-MM-DD`)
  }
}

// ─── Module validator ─────────────────────────────────────────────────────────

function validateModule(modulePath) {
  // 1. Required files
  const requiredFiles = ['index.ts', 'example.ts', 'meta.json', 'README.md']
  for (const file of requiredFiles) {
    if (fs.existsSync(path.join(modulePath, file))) {
      pass(`${file} tồn tại`)
    } else {
      fail(`${file} thiếu`)
    }
  }

  // 2. meta.json fields
  const metaPath = path.join(modulePath, 'meta.json')
  if (fs.existsSync(metaPath)) {
    let meta
    try {
      meta = JSON.parse(fs.readFileSync(metaPath, 'utf8'))
    } catch (e) {
      fail(`meta.json parse lỗi: ${e.message}`)
      return
    }

    const missing = MODULE_META_FIELDS.filter(f => !meta[f])
    if (missing.length) {
      fail(`meta.json thiếu fields: ${missing.join(', ')}`)
    } else {
      pass('Tất cả module meta fields có mặt')
    }
  }

  // 3. index.ts — dispose() pattern
  const indexPath = path.join(modulePath, 'index.ts')
  if (fs.existsSync(indexPath)) {
    const src = fs.readFileSync(indexPath, 'utf8')

    const hasGPU = /new THREE\.(BufferGeometry|ShaderMaterial|RawShaderMaterial|Texture|WebGLRenderTarget)/.test(src)
    const hasDispose = /dispose\s*\(\s*\)\s*[:{]/.test(src)

    if (hasGPU && !hasDispose) {
      fail('Có GPU resource (Geometry/Material/Texture) nhưng thiếu dispose() method')
    } else if (hasGPU) {
      pass('dispose() có mặt (GPU resource detected)')
    }

    // 4. Không dùng `any`
    if (/:\s*any\b/.test(src)) {
      fail('Có dùng TypeScript `any` — vi phạm strict mode')
    } else {
      pass('Không có `any` type')
    }

    // 5. Không inline shader string dài (> 5 dòng = ~150 chars với newlines)
    const inlineShader = /`[^`]{150,}`/.test(src)
    if (inlineShader) {
      fail('Shader string inline dài — phải tách ra file .glsl / .wgsl riêng (import ?raw)')
    } else {
      pass('Không có inline shader string dài')
    }

    // 6. Non-null assertion
    if (/[^!]!\s*[.[]/.test(src)) {
      warn('Có dùng ! non-null assertion — xem xét lại')
    }
  }

  // 7. TypeScript type check
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
  console.log('  node validate.js assets/buildings/quan-ca-phe')
  console.log('  node validate.js threejs-modules/shaders/TriplanarMapping')
  process.exit(0)
}

const resolved = path.resolve(targetArg)

if (!fs.existsSync(resolved)) {
  console.error(`❌ Path không tồn tại: ${resolved}`)
  process.exit(1)
}

const isAsset   = resolved.includes(`${path.sep}assets${path.sep}`)
const isModule  = resolved.includes('threejs-modules')

console.log(`\n${'─'.repeat(55)}`)
if (isAsset) {
  console.log(`ASSET CHECK: ${path.basename(resolved)}`)
  console.log('─'.repeat(55))
  validateAsset(resolved)
} else if (isModule) {
  console.log(`MODULE CHECK: ${path.basename(resolved)}`)
  console.log('─'.repeat(55))
  validateModule(resolved)
} else {
  console.error('❌ Không xác định được loại — path phải chứa "assets/" hoặc "threejs-modules/"')
  process.exit(1)
}

console.log('─'.repeat(55))
if (errors === 0) {
  console.log('✅ PASS — đạt chuẩn, có thể chuyển sang bước tiếp theo\n')
  process.exit(0)
} else {
  console.log(`❌ FAIL — ${errors} lỗi cần fix trước khi chuyển bước\n`)
  process.exit(1)
}
