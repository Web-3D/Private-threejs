# Release Workflow — Semantic Versioning + CI/CD Pipeline

> Hai tính năng này phụ thuộc nhau: SemVer cần CI để tự động publish,
> CI/CD cần SemVer để deploy đúng version. Implement cùng lúc hoặc không implement.

---

## Semantic Versioning per Module

Mỗi module trong `threejs-modules/` có `version: "1.2.0"` đúng SemVer,
CHANGELOG.md tự generate từ conventional commits, npm publish workflow.
Pattern này dùng trong React Three Fiber ecosystem (Drei, R3F).

**Tại sao hoãn:** `.module-lock.json` track bằng commit SHA đã đủ cho private library 1 người.
SemVer chỉ có giá trị khi người khác dùng library — họ cần biết "version nào break gì".

---

## CI/CD Pipeline — GitHub Actions

Tự động chạy lint, type-check, validate trên cloud mỗi khi push lên GitHub.
Auto-deploy lên Vercel/Cloudflare Pages khi push main. Auto-publish npm khi tag version mới.

**Tại sao hoãn:** Husky local gates đang bắt lỗi hiệu quả trước commit.
CI/CD chỉ thực sự cần khi có collaborator không có Husky setup trên máy họ.

---

## Khi nào revisit cả hai cùng lúc

- Muốn publish `threejs-modules/` ra npm **HOẶC**
- Có 1+ collaborator cần coordinate updates

Nếu chỉ cần auto-deploy (không publish npm) → implement CI/CD trước, SemVer sau.

## Estimated effort
- CI/CD only: 2-4 giờ (GitHub Actions YAML + secrets + deploy config)
- CI/CD + SemVer: thêm 2-3 giờ (conventional commits setup + release script)

## Nguồn tham khảo
Research 2025-05 — React Three Fiber/Drei versioning workflow, DORA State of AI report.
