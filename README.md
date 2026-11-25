# Hoàng Gia Hotel — Hệ thống Quản lý Khách sạn & Đặt phòng

## 1. Giới thiệu bài toán

Trong vận hành khách sạn vừa và nhỏ, việc quản lý bằng sổ sách hoặc rời rạc giữa kênh đặt phòng và quầy lễ tân thường dẫn đến trùng lịch phòng, sai sót khi tính tiền cọc/hoàn tiền, khó kiểm soát trạng thái dọn phòng và thiếu minh bạch khi tổng hợp hóa đơn dịch vụ lúc trả phòng.

Dự án **Hoàng Gia Hotel** xây dựng một hệ thống web tập trung cho **3 nhóm người dùng**, số hóa trọn vẹn vòng đời từ lúc khách tìm phòng đến khi hoàn tất thanh toán:

- **Khách hàng (`/`, `/rooms`, `/booking`, `/my-bookings`)**: Tìm phòng trống theo ngày nhận/trả và sức chứa, đặt một hoặc nhiều phòng cùng lúc, thanh toán tiền cọc qua mã **VietQR** (mặc định 30% trong 15 phút) và báo đã chuyển khoản, theo dõi trạng thái xác minh/hủy phòng/hoàn tiền, gọi dịch vụ khi đang lưu trú và xem hóa đơn.
- **Lễ tân (`/reception`)**: Theo dõi bảng điều khiển vận hành, sơ đồ trạng thái phòng thời gian thực (`AVAILABLE`, `BOOKED`, `OCCUPIED`, `CLEANING`, `MAINTENANCE`), lịch phòng theo ngày, duyệt/từ chối booking, xác minh giao dịch chuyển khoản đặt cọc, thực hiện check-in / check-out, ghi nhận sử dụng dịch vụ và xuất/thu tiền hóa đơn.
- **Quản trị viên (`/admin`)**: Quản lý tài khoản nhân viên lễ tân, danh mục phòng – hạng phòng – dịch vụ, xem biểu đồ phân tích biến động giá 6 tháng và cấu hình hệ số chiến lược giá (`STANDARD` / `WEEKEND` / `HOLIDAY`).

---

## 2. Công nghệ sử dụng

- **Backend**: Node.js, Express 5, TypeScript (`tsx`), xác thực JWT (`HS256`) và mã hóa mật khẩu bằng `bcryptjs`.
- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS v4, TanStack Query, React Router, Axios, React Hook Form + Zod, Recharts.
- **Dữ liệu khởi tạo**: `server/store.ts` lưu dữ liệu trên bộ nhớ (**in-memory**) và tự động đọc file `data.sql` lúc khởi động để nạp 4 hạng phòng, 12 phòng, bộ ảnh gallery và 8 dịch vụ mẫu.

> **Lưu ý về Database (`data.sql`)**: File `data.sql` hiện chứa sẵn schema & dữ liệu seed cho 6 bảng danh mục (`room_types`, `room_type_images`, `service_items`, `rooms`, `room_images`, `room_services`). Các dữ liệu nghiệp vụ (`users`, `bookings`, `payments`, `invoices`, `refunds`, `pricingRates`…) đang được lưu trong RAM và sẽ reset khi khởi động lại server. Nếu muốn kết nối MySQL thật để lưu lâu dài, cần import `data.sql`, bổ sung thêm các bảng nghiệp vụ và thay lớp lưu trữ trong `server/store.ts` bằng driver/ORM (ví dụ `mysql2`, Prisma hoặc Drizzle).

---

## 3. Yêu cầu hệ thống

- **Node.js**: Phiên bản `20.19+` hoặc `22+`
- **npm**: Đi kèm theo Node.js

---

## 4. Hướng dẫn cài đặt và chạy dự án

### Bước 1: Clone mã nguồn và cài dependencies

```bash
git clone <url-repository-cua-ban>
cd <ten-thu-muc-du-an>
npm install
```

### Bước 2: Cấu hình biến môi trường (tùy chọn)

Sao chép file `.env.example` thành `.env` ở thư mục gốc nếu bạn muốn tùy chỉnh cấu hình:

```bash
cp .env.example .env
```

Các biến môi trường hỗ trợ:

| Nhóm | Biến | Mô tả |
|---|---|---|
| Bảo mật & CORS | `ACCESS_TOKEN_SECRET` | Chuỗi bí mật ký JWT |
| | `CORS_ALLOWED_ORIGINS` | Danh sách origin được phép gọi API |
| Tài khoản khởi tạo | `APP_BOOTSTRAP_ADMIN_USERNAME`, `APP_BOOTSTRAP_ADMIN_PASSWORD` | Tạo thêm tài khoản Admin lúc khởi động |
| | `APP_BOOTSTRAP_RECEPTIONIST_USERNAME`, `APP_BOOTSTRAP_RECEPTIONIST_PASSWORD` | Tạo thêm tài khoản Lễ tân lúc khởi động |
| Thanh toán VietQR | `HOTEL_BANK_BIN`, `HOTEL_BANK_ACCOUNT`, `HOTEL_BANK_ACCOUNT_NAME` | Mã ngân hàng, số tài khoản, tên chủ tài khoản nhận cọc |
| Thông tin hiển thị (Frontend) | `VITE_API_BASE_URL` | Base URL cho API (mặc định `/api`) |
| | `VITE_HOTEL_NAME`, `VITE_HOTEL_ADDRESS`, `VITE_HOTEL_LATITUDE`, `VITE_HOTEL_LONGITUDE`, `VITE_HOTEL_MAP_EMBED_URL` | Tên, địa chỉ và bản đồ Google Maps của khách sạn |
| | `VITE_HOTLINE_NUMBER`, `VITE_ZALO_PERSONAL_URL` | Số hotline và link Zalo liên hệ nổi trên trang khách hàng |

*(Nếu không tạo `.env`, hệ thống vẫn chạy bình thường với các giá trị mặc định phục vụ phát triển local.)*

### Bước 3: Chạy ở chế độ phát triển (Development)

```bash
npm run dev
```

Lệnh này khởi động đồng thời API server Express và Vite middleware trên cùng một cổng:
- Truy cập ứng dụng tại: **`http://localhost:3000`**

### Bước 4: Build và chạy Production

```bash
npm run build
npm start
```

### Bước 5: Kiểm tra TypeScript & chạy Unit Test

```bash
npm run lint   # Kiểm tra type frontend & server
npm test       # Chạy test suite frontend (Vitest)
```

---

## 5. Tài khoản trải nghiệm (Demo)

Hệ thống nạp sẵn 4 tài khoản mẫu với mật khẩu chung là **`123456`**:

| Vai trò | Tên đăng nhập | Khu vực truy cập |
|---|---|---|
| Khách hàng | `demo.customer1` hoặc `demo.customer2` | `/`, `/rooms`, `/booking`, `/my-bookings`, `/profile` |
| Lễ tân | `demo.reception` | `/reception` |
| Quản trị viên | `demo.admin` | `/admin` |

---

## 6. Cấu trúc thư mục chính

```text
├── server.ts            # Express API server & phục vụ Vite/static frontend
├── server/store.ts      # Lưu trữ in-memory, seed dữ liệu & nghiệp vụ đặt phòng/thanh toán
├── data.sql             # SQL schema + dữ liệu mẫu hạng phòng, phòng, ảnh và dịch vụ
├── frontend/            # Ứng dụng React + TypeScript + Vite (Customer, Reception, Admin)
├── .env.example         # Mẫu biến môi trường
└── package.json         # Scripts điều phối workspace (dev, build, lint, test, start)
```
