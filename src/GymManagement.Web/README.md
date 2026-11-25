<div align="center">

# 🏋️ GYM MANAGER — Web Frontend

**Giao diện vận hành phòng tập · Cyber-Fitness Dark Theme**

![React](https://img.shields.io/badge/React-20232A?style=for-the-badge&logo=react&logoColor=61DAFB)
![Vite](https://img.shields.io/badge/Vite-646CFF?style=for-the-badge&logo=vite&logoColor=white)
![React Router](https://img.shields.io/badge/React_Router-CA4245?style=for-the-badge&logo=react-router&logoColor=white)
![Lucide](https://img.shields.io/badge/Lucide_Icons-0d1523?style=for-the-badge&logoColor=d4f933)

</div>

---

## 📌 Giới thiệu

Đây là phần **frontend React/Vite** của hệ thống *Gym Management* (Nhóm 6). Ứng dụng có hai khu vực:

| Khu vực | Đường dẫn | Dành cho |
|---|---|---|
| **Cổng khách hàng** | `/portal` | Khách xem gói tập, đăng ký online, tra cứu thông tin |
| **Hệ thống nội bộ** | `/` (cần đăng nhập) | Nhân viên & quản trị viên vận hành câu lạc bộ |

Backend (ASP.NET Core + MySQL) và hướng dẫn cấu hình database nằm ở [README chung của dự án](../../README.md).

---

## ✨ Tính năng giao diện

- 🌑 **Cyber-Fitness Dark Theme** — nền tối sâu, điểm nhấn neon lime, hệ thống màu thống nhất qua CSS variables.
- ⌨️ **Bảng lệnh tìm nhanh (Ctrl + K)** — mở từ bất kỳ trang nào, gõ để nhảy tới trang hoặc thực hiện tác vụ.
- 💳 **Thẻ chỉ số Dashboard** — viền màu theo loại chỉ số, nổi nhẹ khi rê chuột.
- 🟢 **Huy hiệu trạng thái động** — trạng thái *Active* có chấm sáng "thở".
- 🪟 **Hộp thoại kính mờ** — nền làm mờ phía sau modal, input sáng viền khi focus.
- 📱 **Responsive** — sidebar thu gọn thành menu trên màn hình nhỏ.
- ♿ **Tôn trọng `prefers-reduced-motion`** — tắt hiệu ứng cho người dùng bật giảm chuyển động.

Chi tiết từng hạng mục cải tiến: [FRONTEND_NOTES.md](FRONTEND_NOTES.md).

---

## ⌨️ Bảng lệnh tìm nhanh

Nhấn **`Ctrl + K`** (macOS: **`⌘ + K`**) hoặc bấm ô *"Tìm kiếm trang hoặc tác vụ..."* trên thanh đầu trang.

| Phím | Tác dụng |
|---|---|
| `Ctrl` / `⌘` + `K` | Mở / đóng bảng lệnh |
| `↑` `↓` | Di chuyển giữa các kết quả |
| `Enter` | Mở trang / chạy tác vụ đang chọn |
| `Esc` | Đóng |

Tìm kiếm **không phân biệt dấu**: gõ `hoi vien`, `hlv` hay `doanh thu` đều ra đúng trang. Mục *Nhân viên* chỉ hiện với tài khoản Admin.

---

## 🚀 Chạy dự án

### Yêu cầu

- **Node.js** 18 trở lên (kèm npm)
- **Backend API** đang chạy tại `http://localhost:5187` — xem [README chung](../../README.md#chạy-api-và-frontend)

### Các bước

```powershell
cd src/GymManagement.Web
npm install
npm run dev
```

Mở **http://localhost:5173**. Vite tự chuyển tiếp các request `/api` sang backend `http://localhost:5187` (cấu hình trong [vite.config.js](vite.config.js)).

> 💡 Nếu PowerShell báo lỗi *"running scripts is disabled"*, dùng `npm.cmd` thay cho `npm`.

### Các lệnh khác

| Lệnh | Mô tả |
|---|---|
| `npm run dev` | Chạy server phát triển, tự tải lại khi sửa code |
| `npm run build` | Build bản production vào thư mục `dist/` |
| `npm run preview` | Xem thử bản build production |

---

## 🗂️ Cấu trúc thư mục

```
src/GymManagement.Web/
├── index.html               # Trang HTML gốc
├── vite.config.js           # Cấu hình Vite + proxy /api
├── package.json
├── FRONTEND_NOTES.md        # Ghi chú cải tiến UI/UX
└── src/
    ├── main.jsx             # Điểm khởi chạy: router, đăng nhập, khung ứng dụng (sidebar, topbar)
    ├── CommandPalette.jsx   # Bảng lệnh tìm nhanh Ctrl + K
    ├── pages.jsx            # Các trang nội bộ: Dashboard, Hội viên, Hóa đơn, Check-in, Báo cáo…
    ├── portal.jsx           # Cổng khách hàng: bảng giá, đăng ký, tra cứu
    ├── api.js               # Gọi API, lưu phiên đăng nhập (JWT)
    └── styles.css           # Toàn bộ giao diện & design tokens
```

---

## 🎨 Bảng màu (Design Tokens)

Khai báo trong `:root` của [styles.css](src/styles.css). Khi thêm giao diện mới, hãy dùng biến thay vì viết mã màu trực tiếp.

| Biến | Giá trị | Dùng cho |
|---|---|---|
| `--canvas` | `#090d16` | Nền toàn trang |
| `--surface` | `#111827` | Thẻ, panel, modal |
| `--line` | `#1e293b` | Đường viền |
| `--ink` | `#f8fafc` | Chữ chính |
| `--muted` | `#94a3b8` | Chữ phụ |
| `--lime` | `#d4f933` | Điểm nhấn chính, nút bấm |
| `--sky` | `#38bdf8` | Thông tin |
| `--amber` | `#f59e0b` | Cảnh báo, chờ xử lý |
| `--emerald` | `#10b981` | Thành công |
| `--coral` | `#f43f5e` | Lỗi, nguy hiểm |

Font chữ: **Space Grotesk** (tiêu đề, số liệu) và **DM Sans** (nội dung).

---

## 🤝 Quy ước đóng góp

**Đặt tên nhánh**

```
feature/<tên-tính-năng>     # ví dụ: feature/ui-ux-cyber-dark-theme
fix/<lỗi-cần-sửa>
```

**Viết commit** theo [Conventional Commits](https://www.conventionalcommits.org/):

| Tiền tố | Khi nào dùng |
|---|---|
| `feat:` | Thêm tính năng mới |
| `fix:` | Sửa lỗi |
| `style:` | Thay đổi giao diện / CSS, không đổi logic |
| `refactor:` | Sắp xếp lại code, không đổi hành vi |
| `docs:` | Tài liệu, README |
| `chore:` | Việc lặt vặt: cấu hình, thư viện |

Ví dụ: `feat(layout): add Ctrl+K command palette`

**Quy trình:** tạo nhánh từ `master` → commit → push → mở Pull Request vào `master` → thành viên khác duyệt rồi merge.

---

<div align="center">

**Nhóm 6 · Lớp ST23A** — UI/UX bởi Nguyễn Việt Anh

</div>
