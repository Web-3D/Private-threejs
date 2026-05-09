# Semantic Versioning per Module + Changelog Automation

## Là gì
Mỗi module trong `threejs-modules/` có `version: "1.2.0"` đúng SemVer,
CHANGELOG.md tự generate từ conventional commits, npm publish workflow.
Pattern này dùng trong React Three Fiber ecosystem (Drei, R3F).

## Tại sao hoãn
`.module-lock.json` đang track bằng commit SHA — đủ để biết version đang dùng.
Semantic versioning chỉ có giá trị khi publish ra npm (người khác cần biết breaking changes),
hoặc team > 1 người cần coordinate updates.
Với 1 người và private library, commit SHA + SYNC.md log đủ dùng.

## Khi nào revisit
- Muốn publish `threejs-modules/` ra npm **HOẶC**
- Team > 1 người cần track "version nào break gì"

## Estimated effort
2-3 giờ setup + cần CI/CD để tự động bump version và publish.

## Nguồn tham khảo
Research 2025-05 — React Three Fiber / Drei versioning workflow.
