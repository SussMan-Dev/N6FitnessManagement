# Hướng dẫn chạy Gym Management trên Windows

## Yêu cầu

- .NET 10 SDK
- Node.js và npm
- MySQL 8.0 trở lên

## 1. Kiểm tra MySQL

Mở PowerShell và kiểm tra MySQL đang chạy, cổng mặc định 3306 đã mở:

```powershell
Get-Service MySQL*
Test-NetConnection localhost -Port 3306
``` 
Tạo database một lần bằng MySQL Workbench hoặc MySQL client:

```sql
CREATE DATABASE FitnessManagement;
```

Nếu đã có database thì không cần tạo lại. Đảm bảo user MySQL trong connection string ở bước tiếp theo có quyền truy cập database này.

## 2. Cấu hình API local

Tạo file `src/GymManagement.Api/appsettings.Development.json` (file này đã được Git ignore) với nội dung sau. Thay user/password MySQL và các giá trị mẫu bằng giá trị của bạn:

```json
{
  "ConnectionStrings": {
    "DefaultConnection": "Server=localhost;Port=3306;Database=FitnessManagement;User ID=root;Password=<mat-khau-mysql>;"
  },
  "Jwt": {
    "Issuer": "GymManagement.Api",
    "Audience": "GymManagement.Client",
    "AccessTokenMinutes": 30,
    "SigningKey": "<chuoi-bi-mat-it-nhat-32-byte>"
  },
  "BootstrapAdmin": {
    "Email": "admin@example.com",
    "Password": "<mat-khau-admin-it-nhat-12-ky-tu>"
  }
}
```

`Jwt:SigningKey` phải dài ít nhất 32 byte UTF-8. Có thể tạo chuỗi ngẫu nhiên trong PowerShell:

```powershell
[Convert]::ToBase64String([Security.Cryptography.RandomNumberGenerator]::GetBytes(32))
```

Chép kết quả vào `SigningKey`. Mật khẩu bootstrap cần có ít nhất 12 ký tự, gồm chữ hoa, chữ thường, số và ký tự đặc biệt. API sẽ tạo tài khoản Admin này khi khởi động lần đầu; sau đó đăng nhập bằng email và mật khẩu đã cấu hình.

Không commit hoặc gửi cho người khác file local này, connection string, JWT signing key hay mật khẩu thật.

## 3. Chạy backend

Mở terminal PowerShell thứ nhất tại thư mục gốc repo (`D:\N6FitnessManagement`):

```powershell
dotnet run --project src/GymManagement.Api/GymManagement.Api.csproj
```

Lần đầu chạy, API sẽ restore/build .NET packages, kết nối MySQL và tự áp dụng migration trong môi trường Development. Nếu thành công:

- API: `http://localhost:5187`
- Swagger: `http://localhost:5187/swagger`

Giữ terminal này mở trong khi chạy frontend. Nếu lỗi kết nối database, kiểm tra service MySQL, tên database, username/password và quyền truy cập.

## 4. Chạy frontend

Mở terminal PowerShell thứ hai tại thư mục gốc repo:

```powershell
Push-Location src/GymManagement.Web
npm ci
npm run dev
```

Mở địa chỉ Vite hiển thị trong terminal, thường là `http://localhost:5173`. Frontend dùng proxy `/api` tới API tại `http://localhost:5187`, nên cần để backend tiếp tục chạy.

Đăng nhập bằng tài khoản bootstrap đã cấu hình ở bước 2. Nếu cổng 5173 đã được dùng, Vite sẽ hiển thị cổng khác; dùng đúng URL được in trong terminal.

## 5. Xác nhận ứng dụng đã sẵn sàng

Trong khi cả hai terminal vẫn đang chạy, mở các địa chỉ sau:

- `http://localhost:5187/swagger` để xác nhận API phản hồi và xem các endpoint.
- URL Vite được in ra ở bước 4 (mặc định `http://localhost:5173`) để xác nhận frontend hiển thị.
- `/portal/plans` trên URL Vite để mở trang gói tập công khai.

Nếu frontend hiển thị nhưng các thao tác dữ liệu lỗi, xác nhận API vẫn chạy và Vite proxy đang trỏ tới port backend `5187`. Nếu port khác đã được chọn cho API, cập nhật target proxy trong `src/GymManagement.Web/vite.config.js` cho khớp rồi khởi động lại Vite.

## Dừng ứng dụng

Nhấn `Ctrl+C` trong từng terminal để dừng backend và frontend.

## Chạy kiểm thử backend

Tại thư mục gốc repo:

```powershell
dotnet test tests/GymManagement.Api.Tests/GymManagement.Api.Tests.csproj
```
