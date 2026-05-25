# memory-vector-search — Vector Search cho AI Memory

**Revisit khi:** Memory zone có 50+ file hoặc mất > 2 phút tìm kiếm context liên quan.

---

## Vấn đề giải quyết

Memory dạng markdown flat-file không có search ngữ nghĩa. Khi memory lớn, AI phải đọc toàn bộ MEMORY.md và chọn file đọc — dễ bỏ sót entry liên quan.

---

## Giải pháp tham khảo — Palinode (Paul-Kyle/palinode)

- **Stars:** 22 | **Version:** v0.8.9 (May 2026)
- Markdown files + SQLite-vec + MCP server
- Hybrid search: BM25 (keyword) + embeddings (semantic)
- Git-native: memory files vẫn là markdown bình thường
- Hoàn toàn local, không cần cloud

### Cách hoạt động
```
Claude query → MCP server → SQLite-vec search → trả về chunks liên quan
                                ↕
                     Memory files (markdown) ← source of truth
```

### Điểm khác biệt với hệ thống hiện tại
- Hiện tại: MEMORY.md index → đọc toàn bộ file → AI tự filter
- Palinode: query semantic → chỉ trả về chunks liên quan → nhanh hơn, ít token hơn

---

## Không làm bây giờ vì

- Memory hiện tại < 15 files — đọc toàn bộ nhanh hơn setup vector DB
- Cần Node.js server chạy thêm — overhead không cần thiết ở scale này
- Zone system vừa setup đã giải quyết phần lớn vấn đề tìm kiếm thủ công

---

## Cũng xem thêm

- `Martian-Engineering/agent-memory` — contradiction detection giữa các memory entry
- `zilliztech/memsearch` — multi-agent memory sync (khi cần sync giữa Claude + Gemini)
