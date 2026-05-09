# .claude/ — Hệ thống Skills & Context

> Thư mục cấu hình cho Claude Code trong workspace `THREEJS/`.
> Đọc file này để hiểu toàn bộ hệ thống trước khi thêm hoặc sửa skill.

---

## Cấu trúc thư mục

```
.claude/
├── README.md              ← file này — index + hướng dẫn hệ thống
├── SKILLS-ROADMAP.md      ← trạng thái 12 skills, priority, khi nào build
├── SKILLS-UPGRADE-LOG.md  ← version history + upgrade roadmap từng skill
└── skills/
    ├── dispose-pattern/
    │   └── SKILL.md
    ├── shader-tsl/
    │   └── SKILL.md
    ├── performance-budget/
    │   └── SKILL.md
    └── module-handoff/
        └── SKILL.md
```

---

## Cách Claude Code đọc skills

Claude Code scan toàn bộ `.claude/skills/*/SKILL.md` lúc session bắt đầu.
Mỗi file có 2 phần:

```
---
name: tên-skill
description: [QUAN TRỌNG NHẤT] — Claude dùng field này để quyết định
             có fire skill này không. Viết bilingual (EN + VI).
---

[Body — nội dung hướng dẫn, checklist, code template...]
```

**Chỉ `description` quyết định trigger.** Body chỉ được đọc khi skill đã fire.

---

## Skill Index

| Skill               | Trạng thái  | Trigger chính                                      | Depends on |
|---------------------|-------------|----------------------------------------------------|-----------|
| `dispose-pattern`   | ✅ Done    | "tạo class", "geometry", "material", "texture"     | — |      
| `shader-tsl`        | ✅ Done    | "viết shader", "uniform", "GLSL", "TSL"            | dispose-pattern |
| `performance-budget`| ✅ Done    | "FPS", "draw call", "lag", "thêm object"           | — |
| `module-handoff`    | ✅ Done    | "import module", "lấy module", "adapt module"      | dispose-pattern |
| `new-module`        | 📋 Phase A | "tạo module mới", "scaffold module"                | dispose-pattern, shader-tsl, performance-budget |
| `gltf-pipeline`     | 📋 Phase A | "gltf-transform", "optimize glb", "weld", "draco"  | — |
| `triplanar-mapping` | 📋 Phase A | "tri-planar", "world-space texture", "bypass UV"   | dispose-pattern, shader-tsl, global-uniforms |
| `global-uniforms`   | 📋 Phase A | "uTime", "uWeather", "sync shader"                 | dispose-pattern, shader-tsl |
| `world-class`       | 📋 Phase B | "tạo World class", "extends BaseWorld"             | dispose-pattern, performance-budget |
| `new-project`       | 📋 Phase B | "tạo project mới", "new project"                   | — |
| `lod-system`        | 📋 Phase B | "LOD", "level of detail", "billboard"              | performance-budget |
| `vat-pipeline`      | 📋 Phase C | "VAT", "vertex animation texture", "Unreal export" | shader-tsl |

---

## Recursive Skill Building

### Khái niệm

Skills không phẳng — chúng có dependency graph. Một skill khi fire có thể
kéo theo context của skill phụ thuộc. Gọi là "recursive" vì tác động lan
xuống theo dependency chain.

**Ví dụ:** User gõ "tạo module mới TriplanarMapping":
```
new-module fires
  └── kéo dispose-pattern   (mọi class GPU)
  └── kéo shader-tsl        (module là shader)
  └── kéo performance-budget (nếu có animation)
        └── dispose-pattern đã có rồi → không duplicate
```

Một lệnh → 3-4 skills active → output đầy đủ pattern.

### 3 Levels hiện tại

---

#### Level 0 — Flat (KHÔNG NÊN dùng)

Mỗi skill độc lập hoàn toàn. Không tham chiếu skill khác.

```markdown
## dispose()
Gọi .dispose() khi xong.
```

**Vấn đề:** Nếu `shader-tsl` không nhắc dispose → shader class thiếu pattern.
User phải nhớ gọi cả 2 skills thủ công.

---

#### Level 1 — Cross-reference (đang dùng)

Skill body **mention** skill khác bằng tên. Claude đọc thấy và tự pull context.

```markdown
## Template class chuẩn

Áp dụng đầy đủ `dispose-pattern` skill cho mọi shader class.
```

**Cách implement:** Thêm dòng mention tên skill phụ thuộc trong body.

**Giới hạn:** Passive — tôi *có thể* bỏ qua nếu không đọc kỹ section đó.

**Skills hiện tại ở level này:** `shader-tsl`, `module-handoff`

---

#### Level 2 — Explicit Dependency Block (khuyến nghị)

Thêm section `## Dependencies` rõ ràng ở **đầu** skill body, trước mọi
nội dung khác. Claude đọc ngay khi skill fire.

```markdown
---
name: triplanar-mapping
description: ...
---

## Dependencies — Active đồng thời

Skill này YÊU CẦU apply cùng lúc:
- `dispose-pattern` — class TriplanarMapping có GPU resource
- `shader-tsl` — viết bằng TSL, theo naming convention `u` prefix
- `global-uniforms` — inject uTime nếu có animation

Không apply dependency → output thiếu pattern → không commit được.

---

[Nội dung chính của skill...]
```

**Cách implement:** Thêm section `## Dependencies` ở **đầu** mỗi SKILL.md
(sau frontmatter, trước nội dung).

**Khi nào dùng:** Mọi skill có dependency ≥ 1.

**Skills cần upgrade lên Level 2:**

| Skill | Dependencies cần thêm |
|-------|----------------------|
| `shader-tsl` | dispose-pattern |
| `module-handoff` | dispose-pattern |
| `global-uniforms` | dispose-pattern, shader-tsl |
| `triplanar-mapping` | dispose-pattern, shader-tsl, global-uniforms |
| `world-class` | dispose-pattern, performance-budget |
| `lod-system` | performance-budget |
| `vat-pipeline` | shader-tsl |

---

#### Level 3 — Orchestrator Skill (dùng cho `new-module`, `new-project`)

Skill không chỉ reference mà **điều phối** nhiều skills theo sequence.
Dùng cho tác vụ multi-step phức tạp.

```markdown
---
name: new-module
description: ...
---

## Orchestration — Thứ tự apply

Skill này là meta-skill. Thực hiện theo đúng thứ tự:

### Bước 1: Scaffold file structure
[hướng dẫn tạo 4 files...]

### Bước 2: Apply `dispose-pattern`
Áp dụng checklist 8 điểm cho class mới.
→ Đọc skill `dispose-pattern` để verify.

### Bước 3: Apply `shader-tsl` (nếu module là shader)
Kiểm tra: TSL trước WGSL trước GLSL. Uniform prefix `u`.
→ Đọc skill `shader-tsl` để verify.

### Bước 4: Apply `performance-budget` (nếu có animation loop)
Thêm RuntimeGuard.
→ Đọc skill `performance-budget` để verify.

### Bước 5: Update catalog
[hướng dẫn update README.md...]
```

**Khi nào dùng:** Tác vụ tạo mới từ đầu (new-module, new-project, world-class).

---

#### Level 4 — Shared Constants (tương lai, chưa implement)

Tách các con số/quy tắc chung ra file riêng. Skills tham chiếu thay vì
duplicate. Ví dụ: budget limits (100 draw calls, 500k triangles) được
định nghĩa 1 chỗ, mọi skill dùng chung.

```
.claude/
└── constants/
    ├── PERFORMANCE_LIMITS.md   ← draw calls, triangles, texture size
    ├── NAMING_CONVENTIONS.md   ← uniform prefix u, file structure
    └── DISPOSE_CHECKLIST.md    ← 8-point checklist
```

**Khi nào build:** Khi có ≥ 3 skills duplicate cùng 1 quy tắc.
Hiện tại chưa cần — 4 skills, overlap chưa đủ lớn.

---

### Dependency Graph toàn bộ 12 skills

```
LEAF (không phụ thuộc):
  dispose-pattern ──────────────────────────────────────┐
  performance-budget ──────────────────────────────┐    │
  gltf-pipeline                                    │    │
  new-project                                      │    │
                                                   │    │
LEVEL 1 (phụ thuộc leaf):                          │    │
  shader-tsl ──────────────────────────────────────┼────┘
  module-handoff ──────────────────────────────────┘
  lod-system ◄── performance-budget
                                                   
LEVEL 2 (phụ thuộc level 1):                       
  global-uniforms ◄── dispose-pattern + shader-tsl 
  world-class     ◄── dispose-pattern + performance-budget
  vat-pipeline    ◄── shader-tsl                   
                                                   
LEVEL 3 (phụ thuộc level 2):                       
  triplanar-mapping ◄── dispose-pattern + shader-tsl + global-uniforms
                                                   
ORCHESTRATOR (điều phối nhiều skills):             
  new-module ◄── dispose-pattern + shader-tsl + performance-budget
```

---

## Hướng dẫn Build Skill Mới

### Checklist trước khi viết SKILL.md

- [ ] Xác định level: Leaf / Level 1 / Level 2 / Orchestrator
- [ ] List dependencies (skills nào phải fire cùng)
- [ ] Viết trigger words: EN + VI phrases
- [ ] Kiểm tra: description có overlap với skill khác không?

### Template SKILL.md chuẩn

```markdown
---
name: ten-skill
description: Use when [EN context]. Triggers when [EN file/action patterns].
             Also triggers on Vietnamese phrases: "[VI phrase 1]", "[VI phrase 2]".
             Do NOT use for [exclusion case].
---

## Dependencies — Active đồng thời

Skill này YÊU CẦU apply cùng lúc:
- `[skill-name]` — [lý do ngắn]

(Bỏ section này nếu là Leaf skill)

---

[Nội dung chính — hướng dẫn, checklist, template code...]
```

### Quy tắc viết description (field quan trọng nhất)

1. **Bắt đầu bằng "Use when"** — context rõ ràng
2. **"Triggers when"** — file pattern hoặc action pattern
3. **"Also triggers on Vietnamese phrases:"** — list phrases trong dấu ngoặc kép
4. **"Do NOT use for"** — exclusion case, tránh false positive
5. **Tối đa 5 dòng** — quá dài → Claude đọc không hết

---

## Upgrade Checklist cho Skills hiện tại

Skills đã build cần upgrade lên Level 2 (thêm `## Dependencies` section):

- [ ] `shader-tsl` — thêm dependency: dispose-pattern
- [ ] `module-handoff` — thêm dependency: dispose-pattern
- [ ] `performance-budget` — không cần (Leaf)
- [ ] `dispose-pattern` — không cần (Leaf)

Skills sẽ build (Phase A) — build đúng level ngay từ đầu:

- [ ] `new-module` — build ở Level Orchestrator
- [ ] `gltf-pipeline` — build ở Leaf
- [ ] `global-uniforms` — build ở Level 2
- [ ] `triplanar-mapping` — build ở Level 2

---

## Test Protocol (2 vòng)

### Vòng 1 — Keyword test (EN)

Gõ exact trigger word từ description, verify skill fires:

```
"I need to create a new shader class with uniforms"
→ Expected: shader-tsl + dispose-pattern fire
```

### Vòng 2 — Natural language test (VI)

Gõ tự nhiên như đang nói chuyện, không dùng keyword:

```
"viết cho tôi cái xử lý đổ màu cho cái khối đó"
→ Expected: shader-tsl fires (trigger: "đổ màu")
```

### Nếu fail cả 2 vòng

Gọi trực tiếp: *"dùng skill [ten-skill]"* — luôn work.
Sau đó xem lại description: từ nào user dùng mà không có trong trigger list?

---

## Tham chiếu nhanh

| Muốn làm gì | Đọc file nào |
|------------|-------------|
| Xem trạng thái 12 skills | `SKILLS-ROADMAP.md` |
| Hiểu recursive skill building | File này, section "Recursive Skill Building" |
| Build skill mới | File này, section "Hướng dẫn Build Skill Mới" |
| Xem skill cụ thể | `skills/[ten-skill]/SKILL.md` |
| Update roadmap | `SKILLS-ROADMAP.md` |
