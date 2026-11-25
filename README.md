# Hoàng Gia Hotel

Hoàng Gia Hotel là ứng dụng web quản lý đặt phòng và vận hành khách sạn. Hệ thống giúp khách tìm phòng theo ngày lưu trú, giúp lễ tân theo dõi tình trạng phòng từ lúc nhận cọc đến khi trả phòng, và giúp quản trị viên quản lý nhân viên, danh mục và giá phòng.

| Vai trò | Chức năng chính |
| --- | --- |
| Khách hàng | Tìm phòng trống, đặt một hoặc nhiều phòng, báo đã chuyển tiền cọc, theo dõi đơn, yêu cầu dịch vụ và xem hóa đơn. |
| Lễ tân | Xem lịch và trạng thái phòng, xử lý đơn, đối chiếu tiền cọc, nhận và trả phòng, ghi nhận dịch vụ, lập hóa đơn và thu tiền. |
| Quản trị viên | Quản lý tài khoản lễ tân, phòng, hạng phòng, dịch vụ và hệ số giá ngày thường, cuối tuần, ngày lễ. |

## 1. Công nghệ sử dụng

| Thành phần | Công nghệ |
| --- | --- |
| Frontend | React 19, TypeScript, Vite 8, Tailwind CSS 4, React Router, TanStack Query và Axios. |
| Backend | Java 21, Spring Boot 3.5.7, Spring Web, Spring Security với JWT, Spring Data JPA và Hibernate. Dự án dùng Maven Wrapper để tải thư viện, kiểm thử và đóng gói. |
| Cơ sở dữ liệu | MySQL 8.0, kết nối qua MySQL Connector/J. |
| Kiểm thử | Vitest và Testing Library cho frontend. JUnit, Mockito và H2 cho backend. |

## 2. Chuẩn bị sau khi giải nén ZIP

1. Giải nén toàn bộ tệp ZIP. Mở thư mục gốc, nơi có cùng lúc `README.md`, `backend/`, `frontend/` và `database/`.
2. Chuẩn bị **JDK 21**, **Node.js 22.12 trở lên** kèm npm, và **MySQL Server 8.0**. Có thể dùng MySQL Workbench để chạy các file SQL. Kết nối mạng cần thiết trong lần đầu npm và Maven tải thư viện.
3. Mở PowerShell tại thư mục gốc và kiểm tra Java, Node.js và npm.

```powershell
java -version
node --version
npm.cmd --version
```

Các lệnh bên dưới viết cho Windows PowerShell. Trên macOS hoặc Linux, dùng `npm`, `./mvnw` và `cp` thay cho `npm.cmd`, `.\mvnw.cmd` và `Copy-Item`.

## 3. Cài thư viện, kiểm thử và build

### Frontend

Từ thư mục gốc, chuyển vào `frontend/` trước khi cài.

```powershell
cd frontend
npm.cmd ci
npm.cmd run lint
npm.cmd test
npm.cmd run build
cd ..
```

`npm ci` cài các phiên bản trong `frontend/package-lock.json` vào **`frontend/node_modules/`**. Bản build nằm trong `frontend/dist/`.

### Backend

Từ thư mục gốc, chạy Maven Wrapper trong `backend/`.

```powershell
cd backend
.\mvnw.cmd clean verify
cd ..
```

Lệnh tự tải thư viện Java, chạy kiểm thử và tạo `backend/target/hotel-management-system-0.0.1-SNAPSHOT.jar`. Bộ kiểm thử backend dùng H2 nên có thể chạy trước khi cấu hình MySQL.

## 4. Tạo và nạp dữ liệu MySQL

1. Khởi động MySQL Server. Trong MySQL Workbench, kết nối tới máy chủ MySQL bằng tài khoản đã có, ví dụ `root` ở `localhost:3306`. Tài khoản cần có quyền tạo database, tạo bảng và thêm dữ liệu.
2. Mở và chạy **toàn bộ** [database/schema.sql](database/schema.sql). File này tự tạo database `hotel_management` với bộ ký tự `utf8mb4` và khởi tạo 20 bảng.
3. Mở và chạy **toàn bộ** [database/data.sql](database/data.sql). File này tự chọn `hotel_management` và thêm dữ liệu mẫu. Chạy bước này một lần trên database vừa khởi tạo vì dữ liệu mẫu dùng ID cố định.

Dữ liệu mẫu gồm 4 hạng phòng, 12 phòng, 8 dịch vụ, 3 cấu hình giá, 4 tài khoản và 7 đơn đặt phòng. Đơn `DEMO-BK-COMPLETED` có sẵn một hóa đơn đã thanh toán. Có thể kiểm tra nhanh trong MySQL Workbench bằng các câu lệnh sau.

```sql
USE hotel_management;
SELECT COUNT(*) AS so_hang_phong FROM room_types;
SELECT COUNT(*) AS so_phong FROM rooms;
SELECT COUNT(*) AS so_dich_vu FROM service_items;
SELECT COUNT(*) AS so_don_dat_phong FROM bookings;
SELECT username, role FROM users ORDER BY id;
```

## 5. Cấu hình biến môi trường

### Backend và kết nối MySQL

Từ thư mục gốc, tạo `.env` bằng cách sao chép [file mẫu backend](.env.example). Nếu đã có `.env`, mở file hiện có để sửa.

```powershell
Copy-Item .env.example .env
```

Mở `.env` ở **thư mục gốc**. Điền tên đăng nhập và mật khẩu MySQL đã dùng ở bước 4. Sửa máy chủ hoặc cổng trong JDBC URL nếu cấu hình MySQL của bạn khác mặc định.

```dotenv
SPRING_DATASOURCE_URL=jdbc:mysql://localhost:3306/hotel_management?useSSL=false&allowPublicKeyRetrieval=true&serverTimezone=Asia/Ho_Chi_Minh&characterEncoding=UTF-8
SPRING_DATASOURCE_USERNAME=root
SPRING_DATASOURCE_PASSWORD=
```

Nếu tài khoản MySQL có mật khẩu, điền sau dấu `=`. Tài khoản khách hàng, lễ tân và quản trị viên của ứng dụng đã được nạp từ `data.sql`.

Để chạy trên máy cá nhân, giữ cổng backend `8080` trong file mẫu. Nếu muốn dùng VietQR nhận tiền cọc, điền đủ `HOTEL_BANK_BIN`, `HOTEL_BANK_ACCOUNT` và `HOTEL_BANK_ACCOUNT_NAME`. Có thể để trống cả ba khi chỉ cần chạy và kiểm tra dự án. Khi triển khai công khai, đặt `ACCESS_TOKEN_SECRET` bằng khóa riêng dài ít nhất 32 byte.

### Thông tin khách sạn trên frontend

Tùy nhu cầu, tạo `frontend/.env` từ [file mẫu frontend](frontend/.env.example). Nếu đã có file này, mở file hiện có để sửa.

```powershell
Copy-Item frontend/.env.example frontend/.env
```

| Biến | Giá trị |
| --- | --- |
| `VITE_HOTEL_NAME`, `VITE_HOTEL_ADDRESS` | Tên và địa chỉ khách sạn. |
| `VITE_HOTEL_MAP_URL` | Link chia sẻ Google Maps, kể cả link rút gọn `maps.app.goo.gl`. Vite lấy tọa độ khi khởi động hoặc build nếu link có thông tin vị trí. Link rút gọn cần kết nối mạng để mở. |
| `VITE_HOTLINE_NUMBER`, `VITE_ZALO_PERSONAL_URL` | Số hotline và link Zalo dạng HTTPS. |
| `VITE_API_BASE_URL` | Để trống khi chạy theo hướng dẫn dưới đây. Vite chuyển tiếp yêu cầu `/api` tới backend ở cổng `8080`. |

Khởi động lại frontend sau khi sửa `frontend/.env`. Nếu cần bản build với cấu hình mới, chạy lại `npm.cmd run build` trong `frontend/`.

## 6. Chạy ứng dụng và kiểm tra kết nối

Mở hai cửa sổ PowerShell tại thư mục gốc.

**Terminal 1 · Backend**

```powershell
cd backend
.\mvnw.cmd spring-boot:run
```

Chờ Spring Boot khởi động trên cổng `8080`. Backend kiểm tra cấu trúc bảng khi khởi động, nên hai file SQL cần được chạy trước.

**Terminal 2 · Frontend**

```powershell
cd frontend
npm.cmd run dev
```

Mở [http://localhost:3000](http://localhost:3000). Để kiểm tra kết nối xuyên suốt từ Vite đến Spring Boot và MySQL, mở [http://localhost:3000/api/room-types](http://localhost:3000/api/room-types). Với dữ liệu mẫu, API trả về `success: true` và danh sách 4 hạng phòng.

Nếu backend báo `Access denied`, kiểm tra tài khoản và mật khẩu trong `.env`. Nếu báo `Unknown database` hoặc thiếu bảng, kiểm tra đã chạy `schema.sql` trên đúng máy chủ MySQL ghi trong JDBC URL. Dùng `Ctrl+C` ở từng cửa sổ để dừng ứng dụng.

## 7. Tài khoản demo

Các tài khoản được nạp bởi `database/data.sql` dùng chung mật khẩu demo **`123456`**.

| Vai trò | Tên đăng nhập | Khu vực |
| --- | --- | --- |
| Khách hàng | `customer1` hoặc `customer2` | `/rooms`, `/my-bookings`, `/profile` |
| Lễ tân | `reception` | `/reception` |
| Quản trị viên | `admin` | `/admin` |

Để xem nhanh dữ liệu sau khi chạy, đăng nhập bằng `customer1`, vào **Theo dõi đặt phòng**, rồi mở đơn `DEMO-BK-COMPLETED` để xem hóa đơn đã thanh toán.

## 8. Cấu trúc thư mục

```text
.
├── backend/
│   ├── .mvn/wrapper/            # Cấu hình Maven Wrapper
│   ├── mvnw, mvnw.cmd           # Lệnh Maven cho Linux/macOS và Windows
│   ├── pom.xml                  # Thư viện và cấu hình build Java
│   ├── src/main/java/com/hotel/ # API, bảo mật, nghiệp vụ, entity và repository
│   ├── src/main/resources/      # application.yml và cấu hình backend
│   └── src/test/                # Kiểm thử Java
├── frontend/
│   ├── .env.example             # Mẫu cấu hình bản đồ, liên hệ và API
│   ├── package.json             # Lệnh và thư viện frontend
│   ├── package-lock.json        # Các phiên bản npm dùng khi cài bằng npm ci
│   ├── public/                  # Ảnh và tài nguyên tĩnh
│   ├── src/                     # Trang khách hàng, lễ tân và quản trị
│   ├── map-link.ts              # Đọc vị trí từ link chia sẻ Google Maps
│   ├── tsconfig*.json           # Cấu hình TypeScript
│   └── vite.config.ts          # Cấu hình Vite, proxy API và Vitest
├── database/
│   ├── schema.sql              # Tạo database và bảng
│   └── data.sql                # Nạp dữ liệu mẫu
├── .env.example                # Mẫu cấu hình MySQL, backend và VietQR
├── package.json                # Lệnh tùy chọn để chạy và kiểm thử từ gốc
└── README.md                   # Hướng dẫn cài đặt và chạy dự án
```

Khi đóng gói ZIP, giữ các file mẫu `.env.example`, `frontend/.env.example`, `backend/.mvn/` và `frontend/package-lock.json`. Người nhận tự tạo `.env` với thông tin MySQL của họ. Các thư mục `node_modules/`, `frontend/node_modules/`, `frontend/dist/`, `backend/target/` và `.npm-temp-cache/` có thể bỏ khỏi ZIP vì được tạo trong quá trình cài và build.
