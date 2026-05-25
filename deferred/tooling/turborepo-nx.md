# Turborepo / Nx — Workspace Task Orchestration

## Là gì
Tool quản lý monorepo với distributed caching, dependency graph giữa các packages,
parallel task execution có thứ tự. Vercel dùng Turborepo, Google/Meta dùng Bazel/Nx.

## Tại sao hoãn
Designed for 20+ packages với shared dependencies và build pipeline phức tạp.
Workspace hiện tại có 3 repos độc lập, không share build artifact giữa nhau.
`validate.js` local caching (MD5 hash) đã đủ cho 1-2 người dùng.
Overhead setup không tương xứng với benefit ở scale này.

## Khi nào revisit
- 5+ projects trong workspace **VÀ**
- Build time > 5 phút **VÀ**
- Team > 1 người

## Estimated effort
4-8 giờ setup + cần restructure package.json hierarchy toàn workspace.

## Nguồn tham khảo
Research 2025-05 — so sánh Vercel/Nx adoption patterns.
