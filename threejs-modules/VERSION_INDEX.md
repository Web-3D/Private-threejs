# VERSION INDEX — threejs-modules

> Quick-scan bảng version của 16 modules.
> Sau khi upgrade Three.js: chạy `node ../scan-versions.js` để detect drift.
> Sau khi bump version module: cập nhật dòng tương ứng + field `three-version-verified` trong meta.json.

---

## Index (20 modules)

| Module               | Version | Three.js Verified | Phase | Category   | Status       |
| -------------------- | ------- | ----------------- | ----- | ---------- | ------------ |
| `GlobalUniforms`     | 1.0.0   | 0.174.0           | A     | utils      | ✅ unit-pass |
| `RuntimeGuard`       | 1.0.0   | 0.174.0           | A     | utils      | ✅ unit-pass |
| `TriplanarMapping`   | 1.0.0   | 0.174.0           | A     | shaders    | ✅ unit-pass |
| `WorldNoise`         | 1.0.0   | 0.174.0           | A     | shaders    | ✅ unit-pass |
| `RoundedCorners`     | 1.0.0   | 0.174.0           | A     | shaders    | ✅ unit-pass |
| `LODSystem`          | 1.0.0   | 0.174.0           | B     | utils      | ✅ unit-pass |
| `ProceduralFracture` | 1.0.0   | 0.174.0           | B     | shaders    | ✅ unit-pass |
| `InteriorMapping`    | 1.0.0   | 0.174.0           | B     | shaders    | ✅ unit-pass |
| `GPUParticleSystem`  | 1.0.0   | 0.174.0           | B     | effects    | ✅ unit-pass |
| `SparkSystem`        | 1.0.0   | 0.174.0           | B     | effects    | ✅ unit-pass |
| `VATShader`          | 1.0.0   | 0.174.0           | C     | shaders    | ✅ unit-pass |
| `LODBillboard`       | 1.0.0   | 0.174.0           | C     | components | ✅ unit-pass |
| `CharacterPool`      | 1.0.0   | 0.174.0           | C     | utils      | ✅ unit-pass |
| `PostProcessing`     | 1.0.0   | 0.174.0           | D     | components | ✅ unit-pass |
| `WindAnimation`      | 1.0.0   | 0.174.0           | D     | shaders    | ✅ unit-pass |
| `DayNightCycle`      | 1.0.0   | 0.174.0           | D     | utils      | ✅ unit-pass |
| `FireSystem`         | 1.0.0   | 0.174.0           | —     | effects    | ✅ unit-pass |
| `DissolveShader`     | 1.0.0   | 0.174.0           | —     | shaders    | ✅ unit-pass |
| `TrailSystem`        | 1.0.0   | 0.174.0           | —     | effects    | ✅ unit-pass |
| `OutlineShader`      | 1.0.0   | 0.174.0           | —     | components | ✅ unit-pass |

---

## Quy trình bump version module

Khi sửa code của 1 module → bump version theo semver:

| Loại thay đổi                     | Bump   | Ví dụ               |
| --------------------------------- | ------ | ------------------- |
| Bug fix, nội bộ — API giữ nguyên  | patch  | 1.0.0 → 1.0.1       |
| Thêm tính năng mới — backward compat | minor | 1.0.0 → 1.1.0       |
| Đổi API (rename method/param)     | major  | 1.0.0 → 2.0.0       |

Sau khi bump:
1. Sửa `"version"` trong meta.json của module đó
2. Cập nhật dòng tương ứng trong bảng trên
3. Nếu re-verify với Three.js mới → cập nhật `"three-version-verified"` trong meta.json

---

## Quy trình sau khi upgrade Three.js

```bash
# Từ thư mục THREEJS/
node scan-versions.js
```

Script đọc tất cả meta.json, so sánh `three-version-verified` với version Three.js đang cài.
Output: danh sách module ✅ up-to-date vs ⚠️ cần re-verify.
