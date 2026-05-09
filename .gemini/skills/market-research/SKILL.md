---
name: market-research
description: Research thị trường AI 3D, tools mới, pricing, workflow mới nổi. Output là báo cáo có cấu trúc để update PIPELINE_TONG_KET.
triggers: "research", "khảo sát", "thị trường", "tool mới", "so sánh tool", "có gì mới", "update pipeline"
---

## Output format chuẩn

Mọi research phải output theo format này để dễ integrate vào PIPELINE_TONG_KET:

```markdown
# Research Report — [Topic]
Date: YYYY-MM-DD

## TL;DR (3 bullet points max)
- ...
- ...
- ...

## Findings

### [Tool/Topic 1]
- Pricing: ...
- Strengths: ...
- Weaknesses: ...
- Verdict: GIỮ / LOẠI / THỬ / THEO DÕI

### [Tool/Topic 2]
...

## So sánh với pipeline hiện tại
[Thay đổi gì so với PIPELINE_TONG_KET_v2.md?]

## Khuyến nghị
- [ ] Action item 1
- [ ] Action item 2

## Sources
- [url/tên nguồn]
```

---

## Scope research — 4 lĩnh vực chính

### 1. AI Generation Tools
Theo dõi: Tripo, Meshy, Rodin, Luma AI, và competitors mới.

Câu hỏi cần trả lời:
- Pricing có thay đổi không?
- Có model mới nào tốt hơn không?
- 3D AI Studio còn là aggregator tốt nhất không?
- Có tool nào mới nổi cần thêm vào pipeline không?

### 2. Three.js Ecosystem
Theo dõi: Three.js releases, TSL updates, WebGPU support.

Câu hỏi cần trả lời:
- API nào đã thay đổi ở version mới?
- TSL có node mới nào hữu ích không?
- Có library nào (Spark.js, GaussianSplats3D...) update quan trọng không?

### 3. Gaussian Splatting
Theo dõi: KHR_gaussian_splatting spec, Spark.js, Apple SHARP.

Câu hỏi cần trả lời:
- KHR spec đã finalized chưa?
- Browser support hiện tại thế nào?
- Có pipeline nào tốt hơn Luma AI → Spark.js không?

### 4. Blender + MCP
Theo dõi: Blender MCP connector updates, addon mới.

Câu hỏi cần trả lời:
- Có workflow mới nào với Blender MCP không?
- Anthropic có update connector không?

---

## Nguồn ưu tiên

| Nguồn | Loại info |
|-------|-----------|
| Twitter/X @threejs | Three.js releases |
| discourse.threejs.org | Community workflows |
| github.com/mrdoob/three.js/releases | Changelog chính thức |
| reddit.com/r/threejs | Thực tế từ devs |
| Product Hunt | Tools mới |
| ai.google/gemini | Gemini capabilities |

---

## Sau khi research xong

1. Lưu report vào `.gemini/research/[date]-[topic].md`
2. Highlight những thay đổi cần update `PIPELINE_TONG_KET_v2.md`
3. Thông báo cho user với TL;DR

**Không tự update PIPELINE_TONG_KET** — report xong, user quyết định có update không.
