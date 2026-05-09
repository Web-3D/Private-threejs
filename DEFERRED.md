# DEFERRED.md — Tính năng hoãn lại

> Các tính năng đã nghiên cứu và đánh giá là **over-engineered** với scale hiện tại.
> Không implement vội — review lại khi workspace đạt ngưỡng ghi ở từng mục.
> Nguồn: research so sánh với Turborepo, Nx, game studio pipeline, AI-native teams (2025-05).

---

## 1. Turborepo / Nx — Workspace Task Orchestration

**Là gì:**
Tool quản lý monorepo với distributed caching, dependency graph giữa các packages,
parallel task execution có thứ tự. Vercel dùng Turborepo, Google/Meta dùng Bazel/Nx.

**Tại sao hoãn:**
Designed for 20+ packages với shared dependencies và build pipeline phức tạp.
Workspace hiện tại có 3 repos độc lập, không share build artifact.
`validate.js` local caching (MD5 hash) đã đủ cho 1-2 người dùng.
Overhead setup 4-8 giờ + learning curve không tương xứng với benefit.

**Khi nào revisit:** 5+ project trong workspace VÀ build time > 5 phút VÀ team > 1 người.

**Estimated effort:** 4-8 giờ setup + cần restructure package.json hierarchy.

---

## 2. Semantic Versioning per Module + Changelog Automation

**Là gì:**
Mỗi module trong `threejs-modules/` có `version: "1.2.0"` đúng SemVer,
CHANGELOG.md tự generate từ conventional commits, npm publish workflow.
Pattern này dùng trong React Three Fiber ecosystem (Drei, R3F).

**Tại sao hoãn:**
`.module-lock.json` đang track bằng commit SHA — đủ để biết version đang dùng.
Semantic versioning chỉ có giá trị khi: (a) publish ra npm để người khác dùng,
hoặc (b) team > 1 người cần biết "version nào break gì".
Với 1 người và private library, commit SHA + SYNC.md log đủ dùng.

**Khi nào revisit:** Muốn publish `threejs-modules/` ra npm, hoặc team > 1 người.

**Estimated effort:** 2-3 giờ + cần setup CI/CD để tự động publish.

---

## 3. CI/CD Pipeline — GitHub Actions

**Là gì:**
Tự động chạy lint, type-check, validate trên cloud mỗi khi push lên GitHub.
Bắt lỗi trước khi merge, auto-deploy lên Vercel/Cloudflare Pages khi push main.

**Tại sao hoãn:**
Husky local gates (tsc + eslint + prettier trước mỗi commit) đang bắt lỗi hiệu quả.
CI/CD chỉ thực sự cần khi: (a) có collaborator không có Husky setup,
hoặc (b) cần auto-deploy production khi push.
Hiện tại chưa ship sản phẩm, chưa có collaborator — CI sẽ chạy nhưng không ai đọc.

**Khi nào revisit:** Có 1+ collaborator VÀ/HOẶC cần auto-deploy lên production host.

**Estimated effort:** 2-4 giờ (workflow YAML + secrets setup trên GitHub).
