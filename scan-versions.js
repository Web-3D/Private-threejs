#!/usr/bin/env node
// scan-versions.js — detect Three.js version drift across all modules
// Usage: node scan-versions.js
// Run after: npm update three (hoặc bất kỳ Three.js version bump)
// Exit code 0 = all up-to-date | Exit code 1 = drift detected

const fs = require('fs')
const path = require('path')

const ROOT = __dirname
const MODULES_DIR = path.join(ROOT, 'threejs-modules')
const THREE_PKG = path.join(MODULES_DIR, 'node_modules', 'three', 'package.json')

// ─── Get installed Three.js version ──────────────────────────────────────────

if (!fs.existsSync(THREE_PKG)) {
  console.error('❌  three not found in threejs-modules/node_modules — run npm install first')
  process.exit(2)
}

const installedVersion = JSON.parse(fs.readFileSync(THREE_PKG, 'utf8')).version

// ─── Walk threejs-modules/**/meta.json ────────────────────────────────────────

function findMetaFiles(dir) {
  const results = []
  for (const entry of fs.readdirSync(dir, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue
    if (entry.name.startsWith('_')) continue // skip _template
    const sub = path.join(dir, entry.name)
    const meta = path.join(sub, 'meta.json')
    if (fs.existsSync(meta)) {
      results.push(meta)
    } else {
      results.push(...findMetaFiles(sub))
    }
  }
  return results
}

const categories = ['shaders', 'utils', 'components', 'effects', 'hooks']
const metaFiles = []
for (const cat of categories) {
  const catDir = path.join(MODULES_DIR, cat)
  if (fs.existsSync(catDir)) metaFiles.push(...findMetaFiles(catDir))
}

// ─── Compare versions ────────────────────────────────────────────────────────

const upToDate = []
const stale = []
const missing = []

for (const file of metaFiles) {
  const meta = JSON.parse(fs.readFileSync(file, 'utf8'))
  const { name, category, version } = meta
  const verified = meta['three-version-verified']

  if (!verified) {
    missing.push({ name, category, version, file: path.relative(ROOT, file) })
  } else if (verified === installedVersion) {
    upToDate.push({ name, category, version, verified })
  } else {
    stale.push({ name, category, version, verified, file: path.relative(ROOT, file) })
  }
}

// ─── Report ──────────────────────────────────────────────────────────────────

const total = upToDate.length + stale.length + missing.length
console.log(`\nThree.js installed: ${installedVersion}`)
console.log(`Modules scanned:    ${total}\n`)

if (upToDate.length > 0) {
  console.log(`✅  Up-to-date (${upToDate.length}/${total}):`)
  for (const m of upToDate) {
    console.log(`    ${m.category}/${m.name}  v${m.version}  — verified: ${m.verified}`)
  }
}

if (stale.length > 0) {
  console.log(`\n⚠️   Needs re-verify after Three.js upgrade (${stale.length}):`)
  for (const m of stale) {
    console.log(`    ${m.category}/${m.name}  v${m.version}  — was: ${m.verified} → now: ${installedVersion}`)
    console.log(`    → ${m.file}`)
  }
}

if (missing.length > 0) {
  console.log(`\n❓  Missing three-version-verified field (${missing.length}):`)
  for (const m of missing) {
    console.log(`    ${m.category}/${m.name}  → ${m.file}`)
  }
}

if (stale.length === 0 && missing.length === 0) {
  console.log('\n✅  All modules verified against current Three.js.\n')
  process.exit(0)
} else {
  console.log('\nTo mark a module as re-verified: update "three-version-verified" in its meta.json\n')
  process.exit(1)
}
