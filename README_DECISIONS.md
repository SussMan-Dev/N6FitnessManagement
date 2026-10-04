# Technical Decisions

### DEC-001 — Target .NET 10 và provider MySQL chính thức

- Ngày: 2026-10-04
- Bối cảnh/vấn đề: kế hoạch ưu tiên .NET 10 nếu môi trường hỗ trợ; Pomelo 9.0.0 là EF Core 9 generation, trong khi cần provider tương thích EF Core 10.
- Các phương án: Pomelo 9 với runtime cũ hơn; Oracle `MySql.EntityFrameworkCore` 10.0.9 với EF Core 10.
- Quyết định: target `net10.0`, dùng `MySql.EntityFrameworkCore` 10.0.9, `Microsoft.EntityFrameworkCore.Design` 10.0.9 và `dotnet-ef` 10.0.9. NuGet công bố provider hỗ trợ EF Core 8/9/10.
- Lý do: theo kế hoạch, ưu tiên runtime LTS hiện hành và tương thích EF Core 10.
- Hệ quả/đánh đổi: MySQL 8.0.46 local và các read endpoints chính đã kiểm tra; automated provider integration/concurrency tests còn thiếu. Package có GPL-2.0-only với Universal FOSS Exception và cần rà soát trước phát hành.
- Khi nào cần xem xét lại: trước khi phát hành sản phẩm hoặc nếu build/integration tests phát hiện incompatibility.

### DEC-002 — Modular monolith với Controller → Service → DbContext

- Ngày: 2026-10-04
- Bối cảnh/vấn đề: cần đường đi dễ đọc và nâng cấp, tránh abstraction không cần cho MVP.
- Các phương án: truy cập DbContext trực tiếp ở controller; thêm repository tổng quát; service dùng EF Core.
- Quyết định: controller gọi service; service thao tác DbContext; chưa thêm generic repository.
- Lý do: phù hợp luồng mặc định và giữ nghiệp vụ ngoài HTTP layer.
- Hệ quả/đánh đổi: service hiện phụ thuộc trực tiếp EF Core; cần kiểm thử bằng test phù hợp thay vì giả định abstraction repository.
- Khi nào cần xem xét lại: khi có nhu cầu thực tế về nhiều persistence backend hoặc logic truy vấn dùng chung phức tạp.

### DEC-003 — Dữ liệu hội viên/gói tập ở lát cắt đầu

- Ngày: 2026-10-04
- Bối cảnh/vấn đề: bắt đầu mô hình dữ liệu trước khi subscription và billing.
- Quyết định: dùng decimal(10,2) cho giá; trạng thái là enum/string; email hội viên nullable nhưng unique khi có giá trị; dùng status/IsActive thay cho xóa cứng; lưu JoinedAtUtc theo UTC.
- Lý do: giữ độ chính xác tiền, tránh mất lịch sử và chuẩn bị liên kết nghiệp vụ về sau.
- Hệ quả/đánh đổi: collation/case-sensitivity và business timezone cần xác nhận; DateOnly đã map tường minh sang MySQL DATE để xử lý provider trả DateTime.
- Khi nào cần xem xét lại: khi chốt ERD, timezone nghiệp vụ hoặc yêu cầu lưu trữ/ẩn danh dữ liệu.

### DEC-004 — MSTest và EF Core InMemory cho service tests ban đầu

- Ngày: 2026-10-04
- Bối cảnh/vấn đề: cần kiểm tra logic CRUD khi môi trường chưa có MySQL.
- Các phương án: chưa thêm test; dùng EF InMemory; dựng MySQL test instance.
- Quyết định: dùng MSTest 4.4.1, EF Core InMemory 10.0.9 và EF Core SQLite 10.0.9; pin native SQLite 3.53.3 trong test project.
- Lý do: InMemory kiểm tra service logic cơ bản; SQLite relational kiểm tra transaction không cần MySQL service.
- Hệ quả/đánh đổi: hai provider test không chứng minh MySQL runtime/mapping hoạt động; cần integration tests thật.
- Khi nào cần xem xét lại: khi có MySQL dev/test database và trước khi tuyên bố hoàn tất giai đoạn persistence.

### DEC-005 — Subscription chờ thanh toán trước khi có ngày hiệu lực

- Ngày: 2026-10-04
- Bối cảnh/vấn đề: kế hoạch yêu cầu không kích hoạt gói trước thanh toán hợp lệ.
- Các phương án: tạo subscription Active ngay khi đăng ký; tạo PendingPayment rồi kích hoạt trong luồng xác nhận payment.
- Quyết định: tạo subscription `PendingPayment`, để `StartsOn`/`EndsOn` null; renewal tạo bản ghi mới liên kết subscription trước.
- Lý do: tránh cấp quyền sử dụng gói khi chưa thu tiền và giữ lịch sử renewal.
- Hệ quả/đánh đổi: payment confirmation cập nhật trạng thái/ngày trong transaction; quy tắc ngày kết thúc inclusive cần nghiệp vụ xác nhận.
- Khi nào cần xem xét lại: khi kiểm tra billing với MySQL thật và chốt cách tính ngày kết thúc.

### DEC-006 — Identity password hashing và JWT role authorization

- Ngày: 2026-10-04
- Bối cảnh/vấn đề: các API thay đổi dữ liệu cần xác thực/phân quyền; mật khẩu không được lưu dạng rõ.
- Các phương án: tự quản lý password hashing/JWT; ASP.NET Core Identity cho user/password/role và JWT bearer cho API stateless.
- Quyết định: dùng ASP.NET Core Identity với password policy tối thiểu 12 ký tự, lockout 5 lần sai/15 phút; role Admin/Staff; JWT signing key bắt buộc lấy từ user secrets/environment và tối thiểu 32 byte.
- Lý do: dùng thành phần nền tảng để xử lý password hash, lockout và role thay vì tự viết bảo mật.
- Hệ quả/đánh đổi: chưa có refresh/revoke token; bootstrap admin chỉ chạy khi được cấu hình và DB đã migrate; auth chưa có unit/integration tests.
- Khi nào cần xem xét lại: trước khi đưa ra môi trường production hoặc khi cần quản lý phiên/thu hồi token.

### DEC-007 — Invoice snapshot và payment confirmation transaction

- Ngày: 2026-10-04
- Bối cảnh/vấn đề: giá plan có thể thay đổi sau khi bán; payment/invoice/subscription không được lệch trạng thái.
- Các phương án: đọc giá hiện tại khi xem hóa đơn; lưu snapshot khi tạo invoice; kích hoạt subscription ngay khi tạo payment.
- Quyết định: invoice lưu snapshot tên plan, giá và duration; payment bắt đầu PendingConfirmation; nhân viên xác nhận amount/reference trong serializable transaction và đồng thời cập nhật invoice/subscription. Dùng version concurrency token cho invoice/payment.
- Lý do: bảo toàn giá đã bán, không để client tự xác nhận và giữ ba trạng thái nhất quán.
- Hệ quả/đánh đổi: ngày kết thúc hiện inclusive và currency chưa được chốt; cần xác minh concurrency/mapping trên MySQL thật.
- Khi nào cần xem xét lại: khi business chốt currency, ngày hiệu lực và khi chạy MySQL integration/concurrency tests.

### DEC-008 — Check-in eligibility và UTC report ranges

- Ngày: 2026-10-04
- Bối cảnh/vấn đề: check-in phải từ chối hội viên không có subscription còn hạn; báo cáo cần khoảng thời gian nhất quán.
- Các phương án: chỉ kiểm tra trạng thái subscription; kiểm tra trạng thái và ngày hiệu lực theo local time; dùng UTC date/time.
- Quyết định: check-in yêu cầu member Active và subscription Active có `StartsOn <= UTC-today <= EndsOn`; báo cáo thời gian dùng UTC, mặc định 30 ngày gần nhất.
- Lý do: kiểm tra quyền còn hạn theo ngày và có quy ước thời gian nhất quán.
- Hệ quả/đánh đổi: timezone phòng gym, quy tắc check-in lặp trong ngày và trainer scheduling chưa được xác nhận.
- Khi nào cần xem xét lại: khi xác nhận timezone chi nhánh và nghiệp vụ vận hành thực tế.

### DEC-009 — Migration theo môi trường

- Ngày: 2026-10-04
- Bối cảnh/vấn đề: migration thay đổi schema database; local Development và production cần chính sách khác nhau.
- Các phương án: tự migrate mọi môi trường; chỉ migrate Development; luôn chạy migration thủ công.
- Quyết định: `Program.cs` gọi `Database.MigrateAsync()` trong Development; production không tự migrate. `InitialCreate` đã áp dụng trên database local được xác minh.
- Lý do: giữ vòng lặp local nhanh, nhưng tránh thay đổi schema production ngoài quy trình deployment.
- Hệ quả/đánh đổi: khởi động Development có thể chạy DDL; phải xác nhận connection string trước khi launch.
- Khi nào cần xem xét lại: khi thiết lập pipeline deployment/migration có kiểm duyệt.

### DEC-010 — DateOnly/DATE mapping cho Oracle MySQL provider

- Ngày: 2026-10-04
- Bối cảnh/vấn đề: MySQL provider materialize MySQL DATE dưới dạng DateTime, gây InvalidCastException cho `DateOnly?` trong entity.
- Các phương án: bỏ DateOnly; chuyển DTO/entity sang DateTime; khai báo nullable value converter rõ ràng.
- Quyết định: dùng `ValueConverter<DateOnly?, DateTime?>` trong `GymDbContext` cho Member.BirthDate và Subscription.StartsOn/EndsOn; đặt column type `date`.
- Lý do: giữ API/domain theo date-only semantics, tránh lỗi cast với Connector/NET.
- Hệ quả/đánh đổi: cần integration tests giữ mapping này trên phiên bản provider/MySQL đang dùng.
- Khi nào cần xem xét lại: khi nâng cấp provider hoặc thay DB.

### DEC-011 — Reset bootstrap Admin có chủ đích

- Ngày: 2026-10-04
- Bối cảnh/vấn đề: bootstrap chỉ tạo Admin khi chưa tồn tại, vì vậy đổi local BootstrapAdmin.Password không cập nhật hash đã có.
- Các phương án: sửa trực tiếp DB; xóa/tạo lại tài khoản; hỗ trợ flag one-shot trong Development.
- Quyết định: chỉ khi `BootstrapAdmin:ResetPassword=true` và môi trường Development, hash của bootstrap Admin hiện tại được cập nhật; thao tác dùng environment override một lần, không lưu trong file.
- Lý do: không reset mật khẩu ngầm ở mọi lần khởi động, đồng thời hỗ trợ môi trường local.
- Hệ quả/đánh đổi: phải xóa/unset flag sau một lần chạy; không được bật trên production.
- Khi nào cần xem xét lại: nếu triển khai quy trình admin/password recovery chính thức.
