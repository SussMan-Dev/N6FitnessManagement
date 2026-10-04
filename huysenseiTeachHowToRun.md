# Hướng dẫn chạy Gym Management

## 1. Bật MySQL

Mở `services.msc`, tìm dịch vụ MySQL (thường là `MySQL80` hoặc `MySQL84`) và chọn **Start**. Kiểm tra cổng mặc định:

```powershell
Test-NetConnection localhost -Port 3306
```

Chỉ tiếp tục khi `TcpTestSucceeded` là `True`.

## 2. Cấu hình local

Kiểm tra `src/GymManagement.Api/appsettings.Development.json` (file này đã được Git ignore). Cập nhật `DefaultConnection` theo MySQL local của bạn và tạo database `FitnessManagement` nếu chưa có.

Để có tài khoản đăng nhập lần đầu, thêm vào cùng file:

```json
"BootstrapAdmin": {
  "Email": "admin@example.com",
  "Password": "MatKhauManh!123"
}
```

Không commit mật khẩu hoặc connection string thật. Tài khoản bootstrap sẽ được gán vai trò `Admin` khi API khởi động.

## 3. Chạy hệ thống

```powershell
dotnet run --project src/GymManagement.Api/GymManagement.Api.csproj
```

Trong môi trường `Development`, ứng dụng tự chạy migration; không cần dùng `dotnet ef database update` mỗi lần.

- Frontend: `http://localhost:5187`
- Swagger API: `http://localhost:5187/swagger`

Mã giao diện được đặt tại `src/GymManagement.Api/Frontend`:

- `index.html`: bố cục và các màn hình.
- `css/site.css`: giao diện, màu sắc và responsive.
- `js/app.js`: đăng nhập JWT và gọi API.

Đăng nhập frontend bằng tài khoản `BootstrapAdmin` đã cấu hình. Có thể chạy kiểm thử bằng:

```powershell
dotnet test tests/GymManagement.Api.Tests/GymManagement.Api.Tests.csproj
```
chạy backend: dotnet run --project src/GymManagement.Api/GymManagement.Api.csproj
Chạy frontend: 
cd cd src/GymManagement.Web
npm.cmd run dev