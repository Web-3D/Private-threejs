# ArchPlanLab → Cross-machine / Cloud persistence

> **Trạng thái:** Deferred — nghiên cứu, chưa implement.
> **Ngày ghi:** 2026-05-29
> **Revisit khi:** deploy ArchPlanLab online và cần làm việc liền mạch trên nhiều máy.

---

## Context

Hiện có 2 cơ chế lưu (commit `fa85352` + batch sau):

- **Autosave localStorage** (`archplan:autosave`) — per-origin, per-browser, per-máy.
  KHÔNG theo máy, KHÔNG theo domain (localhost ≠ domain deploy = khác origin).
- **Save/Load file** (`serializeDesign`/`parseDesign`, versioned) — FSA `showSaveFilePicker`/
  `showOpenFilePicker`, fallback download/input. File JSON **portable hoàn toàn** (không có
  path/handle/máy nào nhúng trong đó) → Load trên máy bất kỳ dựng lại y nguyên.

→ Cross-machine HIỆN TẠI = thủ công: máy A `Save` thẳng file vào working tree git (FSA cho
chọn folder) → `git add/commit/push`; máy B `git pull` → bấm `📁 Load` chọn file. App KHÔNG
tự đụng git (không commit, không pull, không đọc từ GitHub). Friction: mỗi đổi = save+commit+push tay.

---

## 3 hướng giảm friction (industry precedent — đừng tự nghĩ lại)

### 1. Load-from-URL dropdown — **ưu tiên cao, nhẹ nhất**
Commit các design vào `public/designs/*.json`, deploy kèm. App `fetch()` 1 manifest +
dropdown chọn → Load không cần download tay. Read-only (Save vẫn ra file/commit tay).
- **Industry:** mọi web app có "examples/templates" load qua fetch static.
- **Feasibility:** ~nửa ngày. `fetch(import.meta.env.BASE_URL + 'designs/...')` → `parseDesign`.
- **Điểm nghẽn:** vẫn phải commit file tay để xuất hiện trong dropdown sau deploy.

### 2. GitHub API (Gist / repo contents) — **trung bình**
Save/Load qua GitHub REST (PAT hoặc OAuth). Đọc/ghi file design thẳng từ trình duyệt, mọi máy.
- **Industry:** TLDraw / Excalidraw lưu Gist; nhiều tool dùng repo làm DB.
- **Feasibility:** trung bình. Cần token (bảo mật — không hardcode), rate limit, xử lý conflict.
- **Rủi ro:** lộ token nếu nhúng client; nên qua proxy/serverless.

### 3. Backend + account (DB) — **nặng, để cuối**
Server lưu design theo user/id; load bằng đăng nhập. Liền mạch thật sự, đa máy + chia sẻ.
- **Industry:** Figma, Planner5D, SketchUp Web.
- **Feasibility:** nặng — auth, DB, API, hosting. Chỉ làm khi có nhiều user / nhu cầu collab.

---

## Quyết định
Hoãn cả 3. Workflow git-thủ-công đủ cho solo dev làm checkpoint. Khi revisit theo thứ tự
**1 → 2 → 3**. Ý 1 (fetch dropdown) đáng làm sớm sau deploy: rẻ, biến repo thành "thư viện
mẫu nhà" load 1 click — vẫn giữ Save→commit tay làm nguồn sự thật.

**Lưu ý kỹ thuật khi deploy:** FSA cần secure context (https) — domain deploy OK; nhưng
autosave trên domain deploy là origin RIÊNG, không kế thừa autosave từ localhost dev.
