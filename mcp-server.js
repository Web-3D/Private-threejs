/**
 * VỊ TRÍ   — c:\Web-3D\THREEJS\mcp-server.js
 * VAI TRÒ  — MCP stdio server — Planning agent query THREEJS state không switch terminal
 * LIÊN HỆ  — Load bởi c:\Projects\web3d-projects\.mcp.json
 *
 * TOOLS: list_modules | get_module_info | get_phase_status | validate_module
 * PROTOCOL: JSON-RPC 2.0 over stdio (MCP spec 2024-11-05)
 *
 * CÁCH DÙNG: tự động qua Claude Code MCP — không chạy tay
 * DISPOSE: N/A — process exit tự clean up
 */

import { createInterface } from 'readline'
import { existsSync, readFileSync, readdirSync, statSync } from 'fs'
import { join, dirname } from 'path'
import { fileURLToPath } from 'url'
import { spawnSync } from 'child_process'

const ROOT = dirname(fileURLToPath(import.meta.url))
const MODULES_DIR = join(ROOT, 'threejs-modules')

// ─── Module scanner ───────────────────────────────────────────────────────────

function scanFlat(dir, category, out) {
  if (!existsSync(dir)) return
  for (const name of readdirSync(dir)) {
    if (name.startsWith('_')) continue
    const metaPath = join(dir, name, 'meta.json')
    if (!existsSync(metaPath)) continue
    try {
      const meta = JSON.parse(readFileSync(metaPath, 'utf-8'))
      out.push({ ...meta, category })
    } catch {}
  }
}

function allModules() {
  const modules = []
  for (const cat of ['effects', 'utils', 'components']) {
    scanFlat(join(MODULES_DIR, cat), cat, modules)
  }
  const shadersDir = join(MODULES_DIR, 'shaders')
  if (existsSync(shadersDir)) {
    for (const sub of readdirSync(shadersDir)) {
      if (sub.startsWith('_')) continue
      const subDir = join(shadersDir, sub)
      if (statSync(subDir).isDirectory()) {
        scanFlat(subDir, `shaders/${sub}`, modules)
      }
    }
  }
  return modules
}

function findModule(name) {
  return allModules().find(m => m.name === name) ?? null
}

// ─── Tool implementations ─────────────────────────────────────────────────────

function tool_list_modules({ category, status } = {}) {
  let modules = allModules()
  if (category) modules = modules.filter(m => m.category.includes(category))
  if (status) modules = modules.filter(m => m.status === status)
  if (modules.length === 0) return 'No modules found matching filters.'
  const lines = modules.map(m =>
    `[${m.category}] ${m.name} (${m.status}) — ${m.description}`
  )
  return `${modules.length} module(s):\n\n${lines.join('\n')}`
}

function tool_get_module_info({ name, category } = {}) {
  if (!name) return 'Required: name'
  const found = category
    ? { name, category }
    : findModule(name)
  if (!found) return `Module "${name}" not found.`

  const dir = join(MODULES_DIR, found.category, found.name ?? name)
  if (!existsSync(dir)) return `Directory not found: ${dir}`

  const metaPath = join(dir, 'meta.json')
  const readmePath = join(dir, 'README.md')
  const meta = existsSync(metaPath) ? readFileSync(metaPath, 'utf-8') : '(no meta.json)'
  const readme = existsSync(readmePath) ? readFileSync(readmePath, 'utf-8') : '(no README.md)'

  return `# ${name} (${found.category})\n\n## meta.json\n\`\`\`json\n${meta}\n\`\`\`\n\n## README\n\n${readme}`
}

function tool_get_phase_status() {
  const roadmapPath = join(ROOT, 'ROADMAP.md')
  if (!existsSync(roadmapPath)) return 'ROADMAP.md not found at THREEJS root'
  return readFileSync(roadmapPath, 'utf-8')
}

function tool_validate_module({ name, category } = {}) {
  if (!name || !category) return 'Required: name, category'
  const validatePath = join(ROOT, 'validate.js')
  if (!existsSync(validatePath)) return 'validate.js not found at THREEJS root'
  const modulePath = `threejs-modules/${category}/${name}`
  const result = spawnSync('node', [validatePath, modulePath], {
    cwd: ROOT,
    encoding: 'utf-8',
    timeout: 30000,
  })
  const out = [result.stdout, result.stderr].filter(Boolean).join('\n').trim()
  return out || '(no output)'
}

// ─── Tool registry ────────────────────────────────────────────────────────────

const TOOLS = {
  list_modules: {
    description: 'List all modules in threejs-modules. Filter by category or status.',
    inputSchema: {
      type: 'object',
      properties: {
        category: { type: 'string', description: 'effects | utils | components | shaders/foundation | shaders/vertex | shaders/fragment' },
        status:   { type: 'string', description: 'unit-pass | wip | deprecated' },
      },
    },
    fn: tool_list_modules,
  },

  get_module_info: {
    description: 'Get meta.json + README for a specific module.',
    inputSchema: {
      type: 'object',
      properties: {
        name:     { type: 'string', description: 'Module name e.g. FireSystem' },
        category: { type: 'string', description: 'Optional. e.g. effects' },
      },
      required: ['name'],
    },
    fn: tool_get_module_info,
  },

  get_phase_status: {
    description: 'Get current phase status from ROADMAP.md.',
    inputSchema: { type: 'object', properties: {} },
    fn: tool_get_phase_status,
  },

  validate_module: {
    description: 'Run validate.js for a module and return pass/fail output.',
    inputSchema: {
      type: 'object',
      properties: {
        name:     { type: 'string', description: 'Module name e.g. FireSystem' },
        category: { type: 'string', description: 'Category e.g. effects' },
      },
      required: ['name', 'category'],
    },
    fn: tool_validate_module,
  },
}

// ─── JSON-RPC 2.0 transport ───────────────────────────────────────────────────

function send(obj) {
  process.stdout.write(JSON.stringify(obj) + '\n')
}

function ok(id, result) {
  send({ jsonrpc: '2.0', id, result })
}

function err(id, code, message) {
  send({ jsonrpc: '2.0', id, error: { code, message } })
}

const rl = createInterface({ input: process.stdin, terminal: false })

rl.on('line', raw => {
  const line = raw.trim()
  if (!line) return

  let msg
  try { msg = JSON.parse(line) } catch {
    err(null, -32700, 'Parse error')
    return
  }

  const { id, method, params } = msg

  // Notifications (no id) — no response
  if (id === undefined) return

  switch (method) {
    case 'initialize':
      ok(id, {
        protocolVersion: '2024-11-05',
        capabilities: { tools: {} },
        serverInfo: { name: 'threejs-mcp', version: '1.0.0' },
      })
      break

    case 'tools/list':
      ok(id, {
        tools: Object.entries(TOOLS).map(([name, def]) => ({
          name,
          description: def.description,
          inputSchema: def.inputSchema,
        })),
      })
      break

    case 'tools/call': {
      const toolName = params?.name
      const args = params?.arguments ?? {}
      const tool = TOOLS[toolName]
      if (!tool) { err(id, -32601, `Unknown tool: ${toolName}`); break }
      try {
        const text = tool.fn(args)
        ok(id, { content: [{ type: 'text', text: String(text) }] })
      } catch (e) {
        err(id, -32000, `Tool error: ${e.message}`)
      }
      break
    }

    default:
      err(id, -32601, `Method not found: ${method}`)
  }
})
