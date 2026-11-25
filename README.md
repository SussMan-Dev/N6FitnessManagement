# Gym Management API

Backend quản lý phòng gym theo mô hình modular monolith, dùng ASP.NET Core Web API, C#, EF Core và MySQL; frontend là React/Vite. Có CRUD hội viên/gói tập/trainer, Identity/JWT, subscription, invoice/payment, check-in và báo cáo cơ bản. Trạng thái local hiện được ghi trong [README_PROGRESS.md](README_PROGRESS.md).

## Phạm vi MVP

MVP source gồm hội viên, gói tập, subscription, hóa đơn/thanh toán nội bộ, check-in, hồ sơ huấn luyện viên và báo cáo cơ bản. Payment confirmation cập nhật trong transaction. MySQL read flows và migration đã được kiểm tra thủ công; automated MySQL integration tests và lịch huấn luyện viên chưa có. Không có Redis, microservices, message queue hoặc cổng thanh toán bên thứ ba.

## Công nghệ

- .NET 10 / ASP.NET Core Web API
- EF Core 10 với `MySql.EntityFrameworkCore` 10.0.9
- MySQL 8.0 trở lên theo tài liệu Connector/NET
- Môi trường local đã kiểm tra với MySQL Server 8.0.46 / service `MySQL80`
- Swagger UI qua Swashbuckle 10.2.3

Provider được chọn để tương thích EF Core 10. Giấy phép GPL-2.0 với FOSS Exception cần được rà soát trước khi phân phối sản phẩm; xem [README_ISSUES.md](README_ISSUES.md) và [README_DECISIONS.md](README_DECISIONS.md).

## Yêu cầu môi trường

- .NET 10 SDK
- MySQL 8.0+ đã cài và đang chạy
- MySQL Workbench tùy chọn để xem/sửa schema

## Tình trạng xác minh tại máy local

| Thành phần | Kết quả |
|---|---|
| API build | PASS — 0 warning, 0 error |
| Frontend build | PASS — Vite 8.3.8 |
| Frontend dependency audit | PASS — 0 vulnerability |
| Backend test discovery/run | Bị Windows Application Control chặn DLL với mã `0x800711C7` |
| Frontend HTTP | PASS — phản hồi `200 OK` tại `127.0.0.1:5173` |
| MySQL local | Migration đã áp dụng; các luồng read, login và báo cáo đã smoke-test thủ công |

## Cấu hình và chạy

Khi chạy local, cấu hình tại `src/GymManagement.Api/appsettings.Development.json`. File này đã được thêm vào `.gitignore`, không commit hoặc chia sẻ. ASP.NET Core tự nạp file khi `ASPNETCORE_ENVIRONMENT=Development`; các giá trị trong file sẽ override `appsettings.json`. File local hiện chứa DB/JWT/bootstrap settings; không chép secret sang README hoặc file base.

File local có dạng:

```json
{
	"ConnectionStrings": {
		"DefaultConnection": "Server=localhost;Port=3306;Database=<database>;User ID=<user>;Password=<local-secret>"
	},
	"Jwt": {
		"Issuer": "GymManagement.Api",
		"Audience": "GymManagement.Client",
		"AccessTokenMinutes": 30,
		"SigningKey": "<random-key-at-least-32-bytes>"
	},
	"BootstrapAdmin": {
		"Email": "<initial-admin-email>",
		"Password": "<strong-local-password>"
	}
}
```

Không thay giá trị placeholder bằng secret thật trong README. Nếu database chưa có tài khoản đầu tiên, cấu hình `BootstrapAdmin` để ứng dụng tạo roles Admin/Staff và tài khoản Admin ở lần khởi động Development sau migration. Nếu đã có Admin, có thể bỏ mục này.

Nếu cần đồng bộ lại mật khẩu của Admin bootstrap đã tồn tại trong database local, chỉ bật cờ một lần trong terminal Development rồi khởi động API; cờ này không được lưu trong file cấu hình:

```powershell
$env:ASPNETCORE_ENVIRONMENT = "Development"
$env:BootstrapAdmin__ResetPassword = "true"
try { dotnet run --project src/GymManagement.Api/GymManagement.Api.csproj --urls http://localhost:5187 }
finally { Remove-Item Env:BootstrapAdmin__ResetPassword -ErrorAction SilentlyContinue }
```

Thao tác này đặt hash mật khẩu Admin về giá trị local `BootstrapAdmin:Password`; chỉ dùng khi chủ động reset tài khoản phát triển.

### Khởi chạy nhanh — API và frontend

Mở PowerShell tại thư mục gốc repository (`d:\N6FitnessManagement`), chạy backend ở terminal thứ nhất:

```powershell
cd d:\N6FitnessManagement
$env:ASPNETCORE_ENVIRONMENT = "Development"
dotnet run --project src/GymManagement.Api/GymManagement.Api.csproj --urls http://localhost:5187
```

Trong Development, `Program.cs` gọi `Database.MigrateAsync()` khi khởi động; thao tác này thay đổi schema DB trong connection string. Chỉ bật Development khi đã xác nhận đúng database đích. Hiện `InitialCreate` và migration `AddStoredFilesAndPaymentReceipt` đã được liệt kê trong migration history khi database hiện hành tương ứng. Swagger: `http://localhost:5187/swagger`.

Mở terminal thứ hai và chạy frontend:

```powershell
cd d:\N6FitnessManagement\src\GymManagement.Web
npm ci
npm run dev -- --host 127.0.0.1
```

Ứng dụng nội bộ và cổng khách hàng có thể truy cập tại:

- Frontend nội bộ: `http://127.0.0.1:5173/`
- Cổng đăng ký/tra cứu khách hàng: `http://127.0.0.1:5173/portal`
- Swagger API: `http://localhost:5187/swagger`

Mở `http://localhost:5173`. Vite proxy `/api` tới `http://localhost:5187`; giữ backend chạy. Đăng nhập bằng tài khoản Admin/Staff đã được cấp. Các màn hình gồm tổng quan, hội viên, gói tập, subscription/gia hạn, hóa đơn, thanh toán, check-in, trainer, báo cáo; Admin có thể tạo Staff.

Database và user MySQL phải tồn tại trước khi backend khởi động. `dotnet ef migrations list` chạy thành công và xác nhận `20261004090816_InitialCreate` đã được áp dụng.

Trong Development, backend tự gọi `Database.MigrateAsync()` khi khởi động. Chỉ dùng các lệnh thủ công sau để review migration hoặc cập nhật schema ngoài luồng khởi động; xác nhận database đích trước khi chạy `database update`:

```powershell
$env:ASPNETCORE_ENVIRONMENT = "Development"
dotnet tool restore
dotnet ef migrations script --project src/GymManagement.Api --startup-project src/GymManagement.Api
dotnet ef database update --project src/GymManagement.Api --startup-project src/GymManagement.Api
```

SQL `InitialCreate` đã kiểm tra: 15 `CREATE TABLE`, 0 `DROP TABLE`. Không cần chạy lại `database update` trên local DB hiện tại.

Swagger UI ở `/swagger` khi chạy môi trường Development.

## Kiểm thử

```powershell
$env:PATH = "$env:LOCALAPPDATA\dotnet;$env:PATH"
dotnet test tests/GymManagement.Api.Tests/GymManagement.Api.Tests.csproj
```

Test backend hiện có 20 MSTest cases; suite bao gồm service tests, invoice/payment transaction tests và portal controller tests dùng EF Core InMemory/SQLite relational. Đây không thay thế kiểm thử tích hợp đầy đủ với MySQL. Các field `DateOnly?` được convert tường minh sang MySQL `DATE`. Đã xác minh thủ công login qua Vite proxy và GET members/dashboard trên MySQL local; automated MySQL integration tests vẫn còn thiếu.

Cách build và kiểm tra từng phần:

```powershell
# Build API
 dotnet build src/GymManagement.Api/GymManagement.Api.csproj --no-incremental

# Build frontend và kiểm tra package
cd d:\N6FitnessManagement\src\GymManagement.Web
npm ci
npm run build
npm audit --omit=dev
cd d:\N6FitnessManagement

# Chạy toàn bộ test backend
 dotnet test tests/GymManagement.Api.Tests/GymManagement.Api.Tests.csproj
```

### Xử lý sự cố chạy local

- **Windows Application Control chặn `.dll`/`.exe`** với mã `0x800711C7`: đây là lỗi chính sách Windows hoặc thiết bị quản trị, không phải stack trace từ API. Thử chạy môi trường terminal/IDE được tổ chức cấp phép; kiểm tra Windows Security, Device Control hoặc Application Control/Defender for Endpoint của máy. Không xóa hoặc thay đổi DLL để né chính sách này.
- **Port `5187` đã được sử dụng**: đổi sang port khác, ví dụ `--urls http://localhost:5190`, đồng thời cập nhật `server.proxy['/api'].target` trong `vite.config.js`.
- **Frontend báo không kết nối API**: xác nhận API chạy trước, giữ terminal backend mở, kiểm tra `http://localhost:5187/swagger` và proxy Vite trỏ đúng port.
- **Backend báo thiếu connection string hoặc signing key**: kiểm tra `appsettings.Development.json` hoặc environment variables `ConnectionStrings__DefaultConnection`, `Jwt__SigningKey`; không commit secret.
- **Muốn reset mật khẩu Admin local**: xem lệnh reset một lần ở phần cấu hình. Sau khi chạy, xóa `BootstrapAdmin__ResetPassword` khỏi terminal/session trước khi khởi động lần sau.
- **Migration thay đổi sai database**: dừng API, kiểm tra lại `ASPNETCORE_ENVIRONMENT` và connection string trước khi khởi động Development hoặc chạy `dotnet ef database update`.
- **Frontend port `5173` đã được sử dụng**: chạy Vite trên port khác bằng `npm run dev -- --host 127.0.0.1 --port 5174`.

## Bản đồ frontend

- `/login`: đăng nhập nhân viên bằng Identity/JWT.
- `/`: tổng quan dashboard.
- `/members`, `/plans`, `/subscriptions`, `/invoices`, `/payments`, `/checkins`, `/trainers`, `/reports`: các trang vận hành nội bộ.
- `/staff`: tạo tài khoản nhân viên; chỉ tài khoản có role `Admin` truy cập.
- `/portal/plans`, `/portal/register`, `/portal/lookup`: cổng công khai để xem gói, đăng ký và tra cứu theo email/số điện thoại.

Phiên nhân viên lưu access token trong `sessionStorage`; token không tự refresh trong MVP. Khi nhận `401`, frontend tự xóa phiên và chuyển về đăng nhập.

## Endpoint hiện có trong mã nguồn
- `POST /api/auth/login` — anonymous.
- `GET /api/users/{id}` và `POST /api/users` — Admin.
- `GET /api/members?search=&page=1&pageSize=20`, `GET /api/members/{id}`, `POST /api/members`, `PUT /api/members/{id}`, `PATCH /api/members/{id}/status` — Admin/Staff.
- `GET /api/membership-plans?search=&includeInactive=false&page=1&pageSize=20`, `GET /api/membership-plans/{id}`, `POST /api/membership-plans`, `PUT /api/membership-plans/{id}`, `PATCH /api/membership-plans/{id}/status` — Admin/Staff.
- `POST /api/subscriptions`, `GET /api/members/{memberId}/subscriptions?page=1&pageSize=20`, `POST /api/subscriptions/{id}/renew` — Admin/Staff.
- `GET /api/invoices?memberId=&page=1&pageSize=20`, `GET /api/invoices/{id}`, `POST /api/invoices` — Admin/Staff.
- `GET /api/payments?invoiceId=&page=1&pageSize=20`, `GET /api/payments/{id}`, `POST /api/invoices/{invoiceId}/payments`, `POST /api/payments/{id}/confirm`, `POST /api/payments/{id}/reject` — Admin/Staff.
- `POST /api/check-ins`, `GET /api/members/{memberId}/check-ins` — Admin/Staff.
- `GET /api/trainers?search=&includeInactive=false&page=1&pageSize=20`, `GET /api/trainers/{id}`, `POST /api/trainers`, `PUT /api/trainers/{id}`, `PATCH /api/trainers/{id}/status` — Admin/Staff.
- `GET /api/reports/revenue?from=&to=`, `GET /api/reports/members`, `GET /api/reports/check-ins?from=&to=`, `GET /api/reports/dashboard?from=&to=` — Admin/Staff.
- `GET /api/portal/plans`, `POST /api/portal/register`, `GET /api/portal/lookup?query=` — public.
- `POST /api/files/upload` — authenticated; `GET /api/files/{id}`, `GET /api/files/{id}/download` — public; `DELETE /api/files/{id}` — Admin/Staff.

Validation dùng DataAnnotations; Identity băm mật khẩu, khóa đăng nhập sau 5 lần sai trong 15 phút và phát hành JWT ngắn hạn. Hội viên/gói tập được ngừng hoạt động thay vì xóa cứng. Giá gói dùng `decimal` với độ chính xác 2 chữ số thập phân. Invoice snapshot tên/giá/thời hạn lúc bán. Payment chỉ được nhân viên xác nhận khi amount khớp invoice; chuyển khoản cần reference. Payment, invoice và subscription được cập nhật cùng transaction. Check-in yêu cầu hội viên active và subscription active trong ngày UTC. Report range mặc định 30 ngày UTC; lịch trainer chưa triển khai.

## Cấu trúc

- `src/GymManagement.Api/Controllers`: HTTP endpoints và phân quyền theo role.
- `src/GymManagement.Api/Services`: nghiệp vụ, Identity, billing, file và truy cập dữ liệu qua EF Core.
- `src/GymManagement.Api/Data`: `GymDbContext`, migrations và mapping `DateOnly`/`DATE`.
- `src/GymManagement.Api/Models`: entity và enum trạng thái.
- `src/GymManagement.Api/DTOs`: request/response API và phân trang.
- `src/GymManagement.Api/Frontend`: bản static frontend cũ đi kèm API project.
- `src/GymManagement.Web`: React/Vite frontend chính, gồm trang nhân viên và cổng khách hàng.
- `tests/GymManagement.Api.Tests`: MSTest cho service, portal và billing transaction.

## Tiến độ và quyết định

- [README_PROGRESS.md](README_PROGRESS.md)
- [README_ISSUES.md](README_ISSUES.md)
- [README_DECISIONS.md](README_DECISIONS.md)