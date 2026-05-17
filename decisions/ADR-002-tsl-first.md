# ADR-002 — TSL-first Shader Policy

**Ngày:** 2026-05-16 | **Trạng thái:** Accepted  
**Revisit khi:** Three.js drop WebGL support hoặc WGSL tooling đủ mature

## Context

Three.js 0.174 hỗ trợ 3 cách viết shader: GLSL (cũ), WGSL (WebGPU native), TSL (Three Shading Language — abstraction layer chạy được trên cả WebGL và WebGPU). Cần chọn default để giữ consistency khi module nhiều lên.

## Decision

Priority: **TSL > WGSL > GLSL**

- GLSL phải có README giải thích lý do (performance-critical, porting từ code cũ...)
- lint-shaders.js enforce: flag inline GLSL trong NodeMaterial
- Mọi module mới bắt đầu bằng TSL, chỉ xuống WGSL/GLSL khi TSL không đủ

## Alternatives đã cân nhắc

| Alternative | Lý do reject |
|---|---|
| GLSL-first | Lock vào WebGL — không forward-compatible với WebGPU |
| WGSL-first | Chỉ chạy trên WebGPU renderer; nhiều user vẫn cần WebGL fallback |
| Tự do theo module | Ecosystem phân rã — mỗi module một cách tư duy |

## Consequences

- TSL API có thể thay đổi theo minor release — scan-versions.js cần verify
- Một số effect phức tạp (custom depth pass, stencil) vẫn cần GLSL — accepted, document lý do
- lint-shaders.js là enforcement tool chính
