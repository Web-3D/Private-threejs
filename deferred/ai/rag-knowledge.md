# RAG — Vector Search cho AI Knowledge Base

## Là gì
Retrieval Augmented Generation: thay vì AI chỉ dựa vào context window,
có thêm vector database để search qua tài liệu lớn và trả về đoạn liên quan.

Với workspace này, RAG sẽ index:
- Three.js 0.174 API docs đầy đủ (không cần verify thủ công từng method)
- `threejs-modules/` documentation khi có 15+ modules (quá lớn để fit context)
- SYNC.md history nhiều năm
- Asset metadata từ REGISTRY.json

## Tại sao hoãn
Workspace hiện tại đã là "RAG thủ công":
- CLAUDE.md luôn loaded (context cố định)
- Skills loaded on-demand theo trigger (retrieval)
- Grep/Glob tools search codebase real-time
- SYNC.md + REGISTRY.json là knowledge base có cấu trúc

Setup RAG thật sự cần: MCP server riêng + embedding pipeline + vector DB (sqlite-vec/Chroma).
Với 0 modules và 0 assets hiện tại, index gần như trống — setup cost > benefit.

## Khi nào revisit
- `threejs-modules/` có **15+ modules** (không còn fit context window) **HOẶC**
- Workspace có **3+ projects** với SYNC.md history dài **HOẶC**
- Muốn Claude Code verify Three.js API mà không cần đọc `node_modules/three/src/`

## Estimated effort
1-2 ngày: MCP server (Node.js) + embedding model + vector DB + indexing pipeline + maintain.

## Stack đề xuất khi implement
- Vector DB: `sqlite-vec` (local, không cần server riêng)
- Embedding: Voyage AI hoặc OpenAI text-embedding-3-small
- MCP server: Node.js, expose tool `search_knowledge(query)`
- Index sources: Three.js docs, threejs-modules READMEs, SYNC.md

## Nguồn tham khảo
Research 2025-05 — AI-native engineering team patterns (OpenAI Codex, Google DORA report).
