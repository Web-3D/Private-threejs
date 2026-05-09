// validate-hook.js — PostToolUse hook, đọc stdin JSON từ Claude Code
const { execSync } = require('child_process')
const path = require('path')

const ROOT = path.resolve(__dirname, '..')

let raw = ''
process.stdin.on('data', d => (raw += d))
process.stdin.on('end', () => {
  let json
  try { json = JSON.parse(raw.replace(/^﻿/, '')) } catch { process.exit(0) }

  const fp = json.tool_input?.file_path
  if (!fp) process.exit(0)

  const norm = fp.replace(/\//g, path.sep)

  const match =
    norm.match(/^(.*?[/\\]assets[/\\][^/\\]+[/\\][^/\\]+)/) ||
    norm.match(/^(.*?[/\\]threejs-modules[/\\][^/\\]+[/\\][^/\\]+)/)

  if (!match) process.exit(0)

  const target = match[1]

  try {
    execSync(`node validate.js "${target}"`, { cwd: ROOT, stdio: 'inherit' })
  } catch {
    // validate.js exit 1 = có lỗi, đã in ra rồi — không cần throw thêm
  }
})
