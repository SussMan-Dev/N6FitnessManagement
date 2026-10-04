# Issues and Risks

## OPEN

### ISSUE-003 — Chưa rà soát giấy phép provider MySQL

- Mức độ: HIGH
- Mô tả: NuGet mô tả `MySql.EntityFrameworkCore` 10.0.9 dưới GPL-2.0-only với Universal FOSS Exception. Khả năng áp dụng với cách phân phối sản phẩm này chưa được xác nhận.
- Ảnh hưởng: có thể ảnh hưởng việc phân phối/phát hành sản phẩm.
- Hướng xử lý: rà soát điều khoản với người phụ trách pháp lý/sản phẩm; cân nhắc provider tương thích EF Core 10 khác nếu cần.
- Trạng thái: OPEN — 2026-10-04.

### ISSUE-004 — Chưa có kiểm thử tích hợp MySQL/API
- Mức độ: MEDIUM
- Mô tả: có 11 service tests dùng EF Core InMemory và 3 invoice/payment tests dùng SQLite relational; login, GET members và dashboard đã được kiểm tra thủ công trên MySQL thật.
- Ảnh hưởng: automated tests vẫn chưa kiểm tra migration, CRUD, DateOnly mapping và payment transaction trên MySQL.
- Hướng xử lý: thêm automated MySQL integration suite với database test cô lập; không dùng InMemory thay thế provider thật.
- Trạng thái: OPEN — 2026-10-04.

### ISSUE-005 — Các quy tắc miền và bootstrap tài khoản còn mở

- Mức độ: MEDIUM
- Mô tả: role Admin/Staff, JWT và bootstrap admin đã có; chưa xác nhận múi giờ nghiệp vụ, quy tắc lưu trữ hội viên, ERD chi tiết, currency/thuế và ngày kết thúc inclusive.
- Ảnh hưởng: có thể cần điều chỉnh schema/API trong migration kế tiếp hoặc trước production.
- Hướng xử lý: chốt các quy tắc miền trước production; tạo migration mới nếu thay đổi schema. Mặc định hiện tại là UTC, không xóa cứng hội viên/gói và giá decimal 2 chữ số.
- Trạng thái: OPEN — 2026-10-04.

### ISSUE-006 — Tạo renewal đồng thời chưa được serialize

- Mức độ: MEDIUM
- Mô tả: service kiểm tra renewal `PendingPayment` trước khi insert, nhưng không có database constraint chống hai request đồng thời tạo renewal trùng.
- Ảnh hưởng: hai request song song có thể tạo nhiều subscription chờ thanh toán cho cùng subscription trước đó.
- Hướng xử lý: thêm cơ chế idempotency/locking hoặc constraint phù hợp và kiểm thử concurrency trước khi dùng nhiều nhân viên đồng thời.
- Trạng thái: OPEN — 2026-10-04.

### ISSUE-009 — Lịch huấn luyện viên chưa được mô hình hóa

- Mức độ: MEDIUM
- Mô tả: hiện chỉ có hồ sơ trainer CRUD; chưa có lịch tập/availability vì tài liệu không chốt quy tắc, time slot hoặc quan hệ member-trainer.
- Ảnh hưởng: phần “lịch tập đơn giản” trong MVP chưa hoàn tất.
- Hướng xử lý: chốt nghiệp vụ lịch, timezone và xung đột slot trước khi thêm schema/API.
- Trạng thái: OPEN — 2026-10-04.

### ISSUE-010 — HTTPS local chưa được smoke-test

- Mức độ: LOW
- Mô tả: smoke test bind HTTP loopback; `HttpsRedirectionMiddleware` log chưa xác định được HTTPS port.
- Ảnh hưởng: chưa xác minh launch profile/chứng chỉ và HTTPS redirect trong cấu hình chạy thực tế.
- Hướng xử lý: cấu hình launch profile HTTPS/dev certificate hoặc reverse proxy URL khi chuẩn bị môi trường chạy; chạy lại smoke test HTTPS.
- Trạng thái: OPEN — 2026-10-04.

## RESOLVED
- ISSUE-001 — .NET SDK 10.0.401 cài tại `%LOCALAPPDATA%\dotnet`, thư mục có trong User PATH; shell đã mở trước lúc cập nhật PATH cần reopen hoặc nạp lại PATH.
- ISSUE-002 — MySQL 8.0.46 service `MySQL80` đang chạy; `InitialCreate` đã áp dụng và có trong migration history. Login, GET members và dashboard đã xác minh thủ công.
- ISSUE-007 — DB/JWT/bootstrap local nằm trong `src/GymManagement.Api/appsettings.Development.json`, file được Git ignore; base `appsettings.json` không chứa connection/JWT key và User Secrets không còn các override đó.
- ISSUE-008 — SQLite test provider kéo native SQLite có advisory CVE-2025-6965; pin `SQLitePCLRaw.lib.e_sqlite3` 3.53.3 trong test project. `dotnet list ... --vulnerable --include-transitive` không còn báo vulnerable package.
- ISSUE-011 — MySQL trả `DateTime` cho các field `DateOnly?`, gây 500 ở members API; `GymDbContext` đã thêm converter tường minh sang MySQL `DATE`. Backend build và 14 tests pass; GET members/dashboard MySQL trả 200.
- ISSUE-012 — Bootstrap Admin đã tồn tại với password hash cũ; đã reset một lần trong Development qua `BootstrapAdmin__ResetPassword=true` process-only flag. Flag không lưu trong file; login qua Vite proxy trả token.
- ISSUE-013 — Frontend runtime thiếu lucide imports `Activity`, `Users`, `Repeat2`, `ScanLine`; đã bổ sung. Login/session guard và Development error boundary đã cập nhật; `npm run build` pass.
