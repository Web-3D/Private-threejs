# ADR-003 — No Singleton cho Shared State

**Ngày:** 2026-05-16 | **Trạng thái:** Accepted  
**Revisit khi:** Cần lazy initialization hoặc DI framework thực sự

## Context

GlobalUniforms v1 là singleton (class + static instance). Pattern này quen thuộc từ game engine (Unity, Unreal) nhưng có vấn đề trong ES module ecosystem: khó test, tight coupling, registration ceremony.

## Decision

Shared state = **exported module-level constants**. Import trực tiếp, không đăng ký.

```typescript
// ✅ Đúng
import { uTime } from '../GlobalUniforms'

// ❌ Sai
GlobalUniforms.getInstance().inject(material)
```

## Alternatives đã cân nhắc

| Alternative | Lý do reject |
|---|---|
| Singleton pattern | inject() ceremony — dễ quên, không tree-shakeable |
| React Context / Provider | Over-engineering cho non-React app |
| EventBus / pub-sub | Thêm indirection không cần thiết cho uniform sync |
| Dependency injection | Chưa có DI framework; overhead > value tại scale hiện tại |

## Consequences

- Module-level constants được share qua ES module caching — đây là behavior đúng
- Side effect import: import GlobalUniforms → uniform objects tồn tại ngay. Acceptable.
- Nếu cần isolated instances (e.g. unit test): tạo `uniform(0)` local, không import từ GlobalUniforms
