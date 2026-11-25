# Hoàng Gia Hotel Management System — Java Spring Boot Backend (`backend`)

Backend Java Maven + Spring Boot (`com.hotel`) độc lập được chuyển đổi và cập nhật đồng bộ từ `hotel_management2/src`, tương thích hoàn toàn với database MySQL (`/database/schema.sql`, `/database/data.sql`), file `.env` ở thư mục gốc và frontend `/frontend`.

> **Lưu ý kiến trúc workspace:** Thư mục `/backend-ts` (Node.js/Express) vẫn được giữ nguyên để môi trường preview chạy trực tiếp trên cổng `3000`, còn `/backend` là backend Java Spring Boot hoàn chỉnh để chạy cục bộ/production với Maven và MySQL.

## Yêu cầu môi trường

- **JDK 21** trở lên (`java -version`)
- **MySQL 8.0+** (hoặc MariaDB tương thích)
- **Maven** hoặc dùng trực tiếp Maven Wrapper (`./mvnw` / `mvnw.cmd`) có sẵn trong thư mục `backend`

## 1. Khởi tạo cơ sở dữ liệu MySQL

Tạo schema và nạp dữ liệu mẫu từ thư mục `/database`:

```bash
mysql -u root -p < database/schema.sql
mysql -u root -p hotel_management < database/data.sql
```

Mặc định `spring.jpa.hibernate.ddl-auto` đặt là `validate`, khớp toàn bộ 20 bảng trong `database/schema.sql` (bao gồm `room_type_images`, `room_images`, `pricing_configurations`, `refunds`, `room_blocks`, ...).

## 2. Cấu hình biến môi trường (`.env`)

`application.yml` tự động nạp `.env` từ thư mục gốc (`../.env`) hoặc ngay trong `backend/.env`:

```env
SERVER_PORT=8080
SPRING_DATASOURCE_URL=jdbc:mysql://localhost:3306/hotel_management?useSSL=false&allowPublicKeyRetrieval=true&serverTimezone=Asia/Ho_Chi_Minh&characterEncoding=UTF-8
SPRING_DATASOURCE_USERNAME=root
SPRING_DATASOURCE_PASSWORD=your_mysql_password
SPRING_JPA_HIBERNATE_DDL_AUTO=validate

ACCESS_TOKEN_SECRET=your-secret-key-at-least-32-characters
CORS_ALLOWED_ORIGINS=http://localhost:5173,http://localhost:3000

# Tùy chọn cấu hình VietQR chuyển khoản đặt cọc
HOTEL_BANK_BIN=970436
HOTEL_BANK_ACCOUNT=0123456789
HOTEL_BANK_ACCOUNT_NAME=KHACH SAN HOANG GIA
```

Nếu muốn backend tự bootstrap thêm tài khoản lúc khởi động (chỉ tạo khi username chưa tồn tại):

```env
APP_BOOTSTRAP_ADMIN_USERNAME=admin_boot
APP_BOOTSTRAP_ADMIN_PASSWORD=StrongPassword123
APP_BOOTSTRAP_RECEPTIONIST_USERNAME=reception_boot
APP_BOOTSTRAP_RECEPTIONIST_PASSWORD=StrongPassword123
```

## 3. Chạy kiểm thử và khởi động Spring Boot

Chạy unit/integration test (dùng H2 chế độ MySQL, không ảnh hưởng DB thật):

```bash
cd backend
./mvnw test
```

Chạy backend Spring Boot (mặc định lắng nghe cổng `8080`):

```bash
cd backend
./mvnw spring-boot:run
```

Hoặc build file JAR:

```bash
cd backend
./mvnw clean package -DskipTests
java -jar target/hotel-management-system-0.0.1-SNAPSHOT.jar
```

## 4. Kết nối với `/frontend`

Trong `.env` (hoặc `frontend/.env`), trỏ API base URL sang Spring Boot backend:

```env
VITE_API_BASE_URL=http://localhost:8080/api
```

Sau đó chạy frontend:

```bash
npm --prefix frontend run dev -- --port 5173
```

## Cấu trúc package (`src/main/java/com/hotel`)

- `config/`: cấu hình Security/CORS, JWT HMAC, VietQR, job hết hạn cọc, bootstrap tài khoản (`AdminBootstrap`, `ReceptionistBootstrap`).
- `controller/`: REST API `/api/auth`, `/api/rooms`, `/api/room-types`, `/api/services`, `/api/bookings`, `/api/reception/**`, `/api/admin/**` (bao gồm `/api/admin/pricing/history`), `/api/invoices`, `/api/bookings/*/deposit`, `/api/reception/deposits`, `/api/bookings/*/refunds`, `/api/reception/refunds`.
- `dto/request` & `dto/response`: toàn bộ DTO request/response và `ApiResponse`.
- `entity/`: 20 JPA entity ánh xạ 1-1 với `database/schema.sql`.
- `enums/`: các enum nghiệp vụ trạng thái phòng, booking, thanh toán, hóa đơn, vai trò.
- `exception/`: `GlobalExceptionHandler` và custom exception.
- `repository/`: Spring Data JPA repositories và query khóa bi quan (`PESSIMISTIC_WRITE`).
- `security/`: `AccessTokenService` & `AccessTokenAuthenticationFilter`.
- `service/` & `service/impl/`: business logic đặt phòng, đặt cọc VietQR, hủy/hoàn tiền, check-in/out, hóa đơn, gợi ý phòng, quản lý phòng/dịch vụ.
- `strategy/pricing/`: Strategy pattern tính giá (`StandardPricing`, `WeekendPricing`, `HolidayPricing`, `PricingStrategyFactory`).
