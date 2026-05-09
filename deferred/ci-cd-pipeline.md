# CI/CD Pipeline — GitHub Actions

## Là gì
Tự động chạy lint, type-check, validate trên cloud mỗi khi push lên GitHub.
Bắt lỗi trước khi merge, auto-deploy lên Vercel/Cloudflare Pages khi push main.

## Tại sao hoãn
Husky local gates (tsc + eslint + prettier trước mỗi commit) đang bắt lỗi hiệu quả.
CI/CD chỉ thực sự cần khi có collaborator không có Husky setup trên máy họ,
hoặc cần deploy tự động lên production host.
Hiện tại chưa ship sản phẩm, chưa có collaborator — CI sẽ chạy nhưng không ai đọc.

## Khi nào revisit
- Có 1+ collaborator **HOẶC**
- Cần auto-deploy lên production host (Vercel, Cloudflare Pages, VPS)

## Estimated effort
2-4 giờ — GitHub Actions workflow YAML + secrets setup + deploy config.

## Nguồn tham khảo
Research 2025-05 — DORA State of AI Assisted Software Development report.
