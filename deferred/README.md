# deferred/ — Tính năng hoãn lại

> Mỗi file = 1 nhóm tính năng đã nghiên cứu nhưng chưa implement vì over-engineered với scale hiện tại.
> Đọc file tương ứng trước khi đề xuất implement bất kỳ tính năng nào ở đây.

| File                                               | Tính năng                                        | Revisit khi                                  |
| -------------------------------------------------- | ------------------------------------------------ | -------------------------------------------- |
| [turborepo-nx.md](turborepo-nx.md)                 | Workspace task orchestration (build cache local) | 5+ projects, build time > 5 phút             |
| [release-workflow.md](release-workflow.md)         | SemVer + CI/CD — publish npm + auto-deploy       | Có collaborator hoặc muốn publish npm        |
| [rag-knowledge.md](rag-knowledge.md)               | RAG vector search cho AI knowledge base          | 15+ modules hoặc 3+ projects với history dài |
| [asset-tag-search.md](asset-tag-search.md)         | Tag index ngược + search-assets.js script        | 30+ asset trong REGISTRY.json                |
| [memory-vector-search.md](memory-vector-search.md) | Vector search (Palinode) cho AI memory zone      | 50+ memory files hoặc search chậm            |
| [character-base-variant.md](character-base-variant.md) | Character Base + Variant Config pipeline     | Phase C — sau Phase A + B xong               |
| [threejs-modules-workspace-package.md](threejs-modules-workspace-package.md) | Nâng cấp threejs-modules thành pnpm workspace package | ~15+ modules hoặc có project thứ 2 dùng chung |
| [future-shaders.md](future-shaders.md)         | GlassShader · DissolveShader · OutlineShader           | Bắt đầu tích hợp modules vào scene thực tế           |
| [future-effects.md](future-effects.md)         | FireSystem · FluidSystem · TrailSystem                 | Có scene cần effect (FluidSystem: cần WebGPU compute) |
| [future-postprocessing.md](future-postprocessing.md) | SSAOPass · MotionBlurPass                        | Scene có geometry phức tạp hoặc object di chuyển nhanh |
| [building-iq-techniques.md](building-iq-techniques.md) | IQ math tricks cho building (palette, periodic windows, fBm height) | Khi building system cần visual phong phú hơn |
| [building-sdf-phases.md](building-sdf-phases.md)   | SDF ray march cho từng building component — Lab preview + bake pipeline | Khi bắt đầu Phase 1 (column/beam) |
| [lab-base-template.md](lab-base-template.md)       | LabBase abstract class — extract từ BuildingLab khi có ≥3 Lab | Khi có TerrainLab hoặc VegetationLab |
