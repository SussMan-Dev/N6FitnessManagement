# TÀI LIỆU CẢI TIẾN GIAO DIỆN & TRẢI NGHIỆM NGƯỜI DÙNG (UI/UX ENHANCEMENTS)
**Thành viên thực hiện:** Nguyễn Việt Anh (Fullstack & UI/UX Developer - Nhóm 6, Lớp ST23A)  
**Nhánh Git:** `feat/vietanh-ui-ux-enhancement`  

---

## 1. Mục tiêu nâng cấp
Dựa trên yêu cầu hiện đại hóa hệ thống và tạo sự đồng bộ hoàn hảo với slide thuyết trình:
- Chuyển đổi toàn diện giao diện từ phong cách cơ bản sang **Cyber-Fitness Midnight Dark Theme** cao cấp.
- Áp dụng gam màu chủ đạo: Nền tối sâu (`#090d16`), Thẻ bề mặt (`#111827`), Điểm nhấn vàng chanh Neon (`#d4f933` / `#ccff00`).
- Tăng cường vi tương tác (micro-interactions), hiệu ứng chuyển động mượt mà và trực quan hóa dữ liệu vận hành.

---

## 2. Các hạng mục cải tiến chi tiết

### 2.1. Bảng màu & Hệ thống Design Tokens (`styles.css`)
- **CSS Variables:** Chuẩn hóa `--canvas`, `--surface`, `--line`, `--ink`, `--muted`, `--lime`, `--lime-glow`.
- **Thanh cuộn tùy biến (Custom Scrollbar):** Thiết kế thanh cuộn mảnh tông tối, bo góc và phát sáng nhẹ khi hover.
- **Hiệu ứng Selection:** Đổi vùng chọn văn bản sang màu Neon Lime tương phản cao.

### 2.2. Bảng điều khiển Tổng quan (Dashboard)
- **Thẻ chỉ số (Metric Cards):**
  - Viền gradient màu sắc theo từng loại chỉ số: Xanh neon (`#d4f933`), Xanh dương (`#38bdf8`), Cam hổ phách (`#f59e0b`), Lục bảo (`#10b981`), Đỏ hồng (`#f43f5e`).
  - Hiệu ứng nổi nhẹ (`transform: translateY(-3px)`) và bóng đổ mềm khi rê chuột.
- **Thẻ chào mừng (Welcome Panel):** Nền gradient tối kết hợp vòng tròn quỹ đạo phát sáng tinh tế.

### 2.3. Bảng dữ liệu & Trạng thái (Tables & Status Badges)
- **Zebra striping & Hover row:** Hàng bảng đổi màu nổi bật khi hover với ánh sáng neon dịu.
- **Huy hiệu trạng thái động (Pulsing Badges):**
  - Trạng thái `Active`: Nền xanh lá trong suốt kèm chấm tròn có hiệu ứng thở (`@keyframes pulse-glow`).
  - Trạng thái `Pending`: Nền vàng hổ phách cảnh báo nhẹ nhàng.
  - Trạng thái `Muted`: Nền xám trung tính tinh tế.

### 2.4. Bàn Check-in Sàn tập (Live Check-in Desk)
- Thiết kế dạng bảng điều khiển chuyên dụng (Console) với khung viền phát sáng.
- Nút bấm check-in màu vàng neon kích thước lớn, dễ thao tác trong môi trường quầy tiếp tân.

### 2.5. Hộp thoại (Modal Dialogs) & Form nhập liệu
- Hiệu ứng làm mờ hậu cảnh (`backdrop-filter: blur(10px)`).
- Input fields có viền phát sáng khi focus, phông chữ Space Grotesk / DM Sans hiện đại.

### 2.6. Cổng Hội viên (Member Portal)
- Nâng cấp Landing Page với hiệu ứng banner tối ưu, thẻ gói tập nổi bật (Popular Plan) có viền vàng neon và nút kêu gọi hành động (CTA) bắt mắt.
