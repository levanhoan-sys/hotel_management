# Hoàng Gia Hotel — Hệ thống Quản lý Khách sạn & Đặt phòng

## 1. Giới thiệu bài toán

Trong vận hành khách sạn vừa và nhỏ, việc quản lý bằng sổ sách hoặc rời rạc giữa kênh đặt phòng và quầy lễ tân thường dẫn đến trùng lịch phòng, sai sót khi tính tiền cọc/hoàn tiền, khó kiểm soát trạng thái dọn phòng và thiếu minh bạch khi tổng hợp hóa đơn dịch vụ lúc trả phòng.

Dự án **Hoàng Gia Hotel** xây dựng một hệ thống web tập trung cho **3 nhóm người dùng**, số hóa trọn vẹn vòng đời từ lúc khách tìm phòng đến khi hoàn tất thanh toán:

- **Khách hàng (`/`, `/rooms`, `/booking`, `/my-bookings`)**: Tìm phòng trống theo ngày nhận/trả và sức chứa, đặt một hoặc nhiều phòng cùng lúc, thanh toán tiền cọc qua mã **VietQR** (mặc định 30% trong 15 phút) và báo đã chuyển khoản, theo dõi trạng thái xác minh/hủy phòng/hoàn tiền, gọi dịch vụ khi đang lưu trú và xem hóa đơn.
- **Lễ tân (`/reception`)**: Theo dõi bảng điều khiển vận hành, sơ đồ trạng thái phòng thời gian thực (`AVAILABLE`, `BOOKED`, `OCCUPIED`, `CLEANING`, `MAINTENANCE`), lịch phòng theo ngày, duyệt/từ chối booking, xác minh giao dịch chuyển khoản đặt cọc, thực hiện check-in / check-out, ghi nhận sử dụng dịch vụ và xuất/thu tiền hóa đơn.
- **Quản trị viên (`/admin`)**: Quản lý tài khoản nhân viên lễ tân, danh mục phòng – hạng phòng – dịch vụ, xem biểu đồ phân tích biến động giá 6 tháng và cấu hình hệ số chiến lược giá (`STANDARD` / `WEEKEND` / `HOLIDAY`).

---

## 2. Công nghệ sử dụng

- **Backend (Production / Local của bạn)**: Dự án hướng tới chạy với **Java (Spring Boot)** kết nối **MySQL 8+** qua biến môi trường trong `.env` (các file `backend/` bằng Node.js/Express chỉ dùng làm API preview trong môi trường AI Studio).
- **Frontend**: React 19, TypeScript, Vite, Tailwind CSS v4, TanStack Query, React Router, Axios, React Hook Form + Zod, Recharts.
- **Dữ liệu & Database (`database/`)**: Gồm `database/schema.sql` (đầy đủ 20 bảng MySQL 8+) và `database/data.sql` (dữ liệu mẫu danh mục, tài khoản demo, cấu hình giá, đặt phòng và hóa đơn).

> **Lưu ý về Database & Preview**:
> - Để import vào MySQL Workbench / MySQL CLI cho backend Java, chạy `database/schema.sql` trước rồi chạy `database/data.sql`.
> - Trong bản preview trên AI Studio (không cài Java/MySQL), `backend/store.ts` đọc 6 bảng danh mục từ `database/data.sql` lúc khởi động và lưu dữ liệu phát sinh tạm thời trong RAM.

---

## 3. Yêu cầu hệ thống

- **Backend (Java + MySQL khi chạy thật)**: JDK, Maven/Gradle, MySQL 8+
- **Frontend / Preview**: Node.js `20.19+` hoặc `22+`, npm

---

## 4. Hướng dẫn cài đặt và chạy dự án

### Bước 1: Clone mã nguồn và cài dependencies Frontend

```bash
git clone <url-repository-cua-ban>
cd <ten-thu-muc-du-an>
npm install
```

### Bước 2: Cấu hình biến môi trường (`.env`) cho Java Backend, MySQL & Frontend

Sao chép file `.env.example` thành `.env` ở thư mục gốc và điền thông số kết nối Java/MySQL:

```bash
cp .env.example .env
```

Các biến môi trường hỗ trợ:

| Nhóm | Biến | Mô tả / Ví dụ |
|---|---|---|
| Java Server & MySQL | `SERVER_PORT` | Cổng chạy Spring Boot (ví dụ `8080`) |
| | `SPRING_DATASOURCE_URL` | JDBC URL MySQL (ví dụ `jdbc:mysql://localhost:3306/hotel_management?useSSL=false&serverTimezone=Asia/Ho_Chi_Minh&characterEncoding=UTF-8`) |
| | `SPRING_DATASOURCE_USERNAME` | Tên đăng nhập MySQL |
| | `SPRING_DATASOURCE_PASSWORD` | Mật khẩu MySQL |
| | `SPRING_JPA_HIBERNATE_DDL_AUTO` | Chế độ Hibernate DDL (khuyên dùng `validate` hoặc `none` khi đã chạy `schema.sql`) |
| Bảo mật & CORS | `ACCESS_TOKEN_SECRET` | Chuỗi bí mật ký JWT |
| | `CORS_ALLOWED_ORIGINS` | Danh sách origin frontend được phép gọi API (ví dụ `http://localhost:3000`) |
| Tài khoản khởi tạo | `APP_BOOTSTRAP_ADMIN_USERNAME`, `APP_BOOTSTRAP_ADMIN_PASSWORD` | Tạo thêm tài khoản Admin lúc khởi động |
| | `APP_BOOTSTRAP_RECEPTIONIST_USERNAME`, `APP_BOOTSTRAP_RECEPTIONIST_PASSWORD` | Tạo thêm tài khoản Lễ tân lúc khởi động |
| Thanh toán VietQR | `HOTEL_BANK_BIN`, `HOTEL_BANK_ACCOUNT`, `HOTEL_BANK_ACCOUNT_NAME` | Mã ngân hàng, số tài khoản, tên chủ tài khoản nhận cọc |
| Thông tin hiển thị (Frontend) | `VITE_API_BASE_URL` | URL backend Java cho frontend (ví dụ `http://localhost:8080/api`, mặc định `/api`) |
| | `VITE_HOTEL_NAME`, `VITE_HOTEL_ADDRESS`, `VITE_HOTEL_LATITUDE`, `VITE_HOTEL_LONGITUDE`, `VITE_HOTEL_MAP_EMBED_URL` | Tên, địa chỉ và bản đồ Google Maps của khách sạn |
| | `VITE_HOTLINE_NUMBER`, `VITE_ZALO_PERSONAL_URL` | Số hotline và link Zalo liên hệ nổi trên trang khách hàng |

*(Nếu chỉ chạy chế độ preview Frontend + mock API trong workspace này mà không tạo `.env`, hệ thống vẫn chạy với cấu hình mặc định local.)*

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
├── backend/             # Backend Express API, TypeScript config & lưu trữ dữ liệu (index.ts, store.ts)
├── frontend/            # Ứng dụng React + TypeScript + Vite (Customer, Reception, Admin)
├── database/            # Script SQL khởi tạo schema (schema.sql) và dữ liệu mẫu (data.sql)
├── .env.example         # Mẫu biến môi trường
├── README.md            # Tài liệu hướng dẫn dự án
└── package.json         # Scripts điều phối workspace (dev, build, lint, test, start)
```
