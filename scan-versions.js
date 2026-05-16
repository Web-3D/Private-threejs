#!/usr/bin/env node
// scan-versions.js — detect (and optionally fix) Three.js version drift
// Usage:
//   node scan-versions.js           → scan + report only
//   node scan-versions.js --update  → scan + auto-update stale meta.json files
// Exit code 0 = all up-to-date | Exit code 1 = drift detected (or fixed)

const fs = require('fs')
const path = require('path')

const ROOT        = __dirname
const MODULES_DIR = path.join(ROOT, 'threejs-modules')
const THREE_PKG   = path.join(MODULES_DIR, 'node_modules', 'three', 'package.json')
const shouldUpdate = process.argv.includes('--update')

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
    if (entry.name.startsWith('_')) continue
    const sub  = path.join(dir, entry.name)
    const meta = path.join(sub, 'meta.json')
    if (fs.existsSync(meta)) results.push(meta)
    else results.push(...findMetaFiles(sub))
  }
  return results
}

const categories = ['shaders', 'utils', 'components', 'effects', 'hooks']
const metaFiles  = []
for (const cat of categories) {
  const catDir = path.join(MODULES_DIR, cat)
  if (fs.existsSync(catDir)) metaFiles.push(...findMetaFiles(catDir))
}

// ─── Compare versions ────────────────────────────────────────────────────────

const upToDate = []
const stale    = []
const missing  = []

for (const absPath of metaFiles) {
  const meta     = JSON.parse(fs.readFileSync(absPath, 'utf8'))
  const verified = meta['three-version-verified']
  const entry    = { name: meta.name, category: meta.category, version: meta.version, absPath }

  if (!verified)                      missing.push({ ...entry, verified: null })
  else if (verified === installedVersion) upToDate.push({ ...entry, verified })
  else                                stale.push({ ...entry, verified })
}

// ─── Report ──────────────────────────────────────────────────────────────────

const total = upToDate.length + stale.length + missing.length
console.log(`\nThree.js installed: ${installedVersion}`)
console.log(`Modules scanned:    ${total}\n`)

if (upToDate.length > 0) {
  console.log(`✅  Up-to-date (${upToDate.length}/${total}):`)
  for (const m of upToDate)
    console.log(`    ${m.category}/${m.name}  v${m.version}  — verified: ${m.verified}`)
}

if (stale.length > 0) {
  console.log(`\n⚠️   Stale — needs re-verify (${stale.length}):`)
  for (const m of stale)
    console.log(`    ${m.category}/${m.name}  v${m.version}  — was: ${m.verified} → now: ${installedVersion}`)
}

if (missing.length > 0) {
  console.log(`\n❓  Missing three-version-verified (${missing.length}):`)
  for (const m of missing)
    console.log(`    ${m.category}/${m.name}  v${m.version}`)
}

// ─── Update ──────────────────────────────────────────────────────────────────

const needsFix = [...stale, ...missing]

if (needsFix.length === 0) {
  console.log('\n✅  All modules verified against current Three.js.\n')
  process.exit(0)
}

if (!shouldUpdate) {
  console.log('\nRun with --update to auto-fix all stale entries.\n')
  process.exit(1)
}

console.log(`\n🔧  Updating ${needsFix.length} module(s)...`)
for (const m of needsFix) {
  const meta = JSON.parse(fs.readFileSync(m.absPath, 'utf8'))
  meta['three-version-verified'] = installedVersion
  fs.writeFileSync(m.absPath, JSON.stringify(meta, null, 2) + '\n')
  console.log(`    ✅  ${m.category}/${m.name}  ${m.verified ?? '(missing)'} → ${installedVersion}`)
}
console.log('\n✅  Done — all meta.json updated.\n')
