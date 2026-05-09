# deferred/ — Tính năng hoãn lại

> Mỗi file = 1 nhóm tính năng đã nghiên cứu nhưng chưa implement vì over-engineered với scale hiện tại.
> Đọc file tương ứng trước khi đề xuất implement bất kỳ tính năng nào ở đây.

| File | Tính năng | Revisit khi |
|------|-----------|-------------|
| [turborepo-nx.md](turborepo-nx.md) | Workspace task orchestration (build cache local) | 5+ projects, build time > 5 phút |
| [release-workflow.md](release-workflow.md) | SemVer + CI/CD — publish npm + auto-deploy | Có collaborator hoặc muốn publish npm |
| [rag-knowledge.md](rag-knowledge.md) | RAG vector search cho AI knowledge base | 15+ modules hoặc 3+ projects với history dài |
