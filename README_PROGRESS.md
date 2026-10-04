# Project Progress

## Trạng thái hiện tại

- Giai đoạn: 6 — source MVP, migration và local MySQL đã chạy; frontend các module đã nối API.
- API: đang chạy Development tại `http://localhost:5187`; Swagger `http://localhost:5187/swagger`.
- Frontend: Vite tại `http://127.0.0.1:5173`, proxy `/api` tới API port 5187.
- Database: MySQL Server 8.0.46 service `MySQL80` chạy; `InitialCreate` xuất hiện trong migration history. Đã xác minh read-only API members trả 2 dòng và dashboard trả 5 metric fields.
- Build frontend: PASS — `Push-Location src/GymManagement.Web; npm.cmd run build; Pop-Location`.
- Backend tests: PASS — 14 passed, 0 failed, 0 skipped; lượt cuối dùng output tạm do API process đang khóa DLL.
- Login: PASS — API login qua Vite proxy trả access token và Admin role sau khi reset hash bootstrap một lần trong Development.
- DateOnly: FIXED — member birth date và subscription dates convert tường minh `DateOnly?` ↔ `DateTime?`, giữ MySQL column `DATE`.

## Nhật ký phiên — 2026-10-04

- Đã hoàn tất: member/plan/trainer CRUD; JWT login/session guard; subscription create/history/renew; invoice snapshot; payment confirm/reject; check-in; reports; UI các module này.
- Frontend auth: sửa null session dereference, response 401 thân thiện, giữ React root qua Vite HMR, thêm render error boundary Development-only; bổ sung các import icon `Activity`, `Users`, `Repeat2`, `ScanLine` từng gây lỗi `WORKSPACE ERROR`.
- Backend runtime: sửa MySQL materialization lỗi `System.DateTime` → `System.DateOnly` bằng explicit nullable date converter ở `GymDbContext`.
- Admin bootstrap: thêm `BootstrapAdmin:ResetPassword`, chỉ cho phép Development; cờ được truyền một lần qua environment process, API tạm chạy port 5188, hash Admin đồng bộ rồi process tạm đã dừng. Không ghi cờ vào config.
- Tài khoản/API smoke: Vite proxy login PASS; token/role có; `GET /api/members` PASS (2 rows); `GET /api/reports/dashboard` PASS (5 fields).
- Kiểm tra database read-only: 2 Identity users, roles Admin/Staff; không ghi email, password hoặc hash vào log/docs.
- Kiểm tra UI build: Vite `npm run build` PASS; diagnostics frontend sạch.
- Cập nhật file: `src/GymManagement.Web/src/main.jsx`, `api.js`, `pages.jsx`, `styles.css`, `package.json`, `package-lock.json`; `src/GymManagement.Api/Data/GymDbContext.cs`, `Services/IdentityBootstrapper.cs`; `README.md` và file README trạng thái.
- Không đổi schema ở phiên này; migration `InitialCreate` đã áp dụng trước đó trong Development, không chạy reset/drop.

## Còn lại / bước tiếp theo

- Mở `http://127.0.0.1:5173`, hard reload và kiểm tra trực quan bằng tài khoản Admin hiện có; kiểm thử browser automation cho đăng nhập thật chưa hoàn tất.
- Thêm automated MySQL integration tests cho CRUD, DateOnly, auth/roles và billing transaction.
- Rà soát license provider `MySql.EntityFrameworkCore` trước phân phối.
- Chốt và triển khai lịch huấn luyện viên; xác nhận timezone, currency và quy tắc ngày kết thúc inclusive.
- Kiểm thử HTTPS launch profile; hiện chủ yếu smoke-test HTTP local.
