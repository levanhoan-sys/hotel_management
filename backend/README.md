# Hoàng Gia Hotel Management System — Java Spring Boot Backend (`backend`)

Backend Java Maven + Spring Boot (`com.hotel`) độc lập được chuyển đổi và cập nhật đồng bộ từ `hotel_management2/src`, tương thích hoàn toàn với database MySQL (`/database/schema.sql`, `/database/data.sql`), file `.env` ở thư mục gốc và frontend `/frontend`.

Backend Java Spring Boot chạy trên cổng `8080`; frontend Vite trong `/frontend` chạy trên cổng `3000` và chuyển tiếp các yêu cầu `/api` đến backend.

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

`application.yml` tự động nạp `.env` từ thư mục gốc (`../.env`) hoặc ngay trong `backend/.env`. Dùng tài khoản MySQL đã có trên máy; chỉ cần ba biến:

```env
SPRING_DATASOURCE_URL=jdbc:mysql://localhost:3306/hotel_management?useSSL=false&allowPublicKeyRetrieval=true&serverTimezone=Asia/Ho_Chi_Minh&characterEncoding=UTF-8
SPRING_DATASOURCE_USERNAME=root
SPRING_DATASOURCE_PASSWORD=your_mysql_password
```

Import `database/schema.sql` và `database/data.sql` theo bước 1. Dữ liệu mẫu đã có sẵn tài khoản admin, lễ tân và khách hàng, nên không cần khai báo thêm tài khoản trong `.env`.

Nếu dùng VietQR, bổ sung đủ `HOTEL_BANK_BIN`, `HOTEL_BANK_ACCOUNT` và `HOTEL_BANK_ACCOUNT_NAME`. Khi triển khai công khai, đặt `ACCESS_TOKEN_SECRET` riêng.

Các biến `SERVER_PORT` và `CORS_ALLOWED_ORIGINS` cũng có trong `.env.example` để đổi cổng backend hoặc địa chỉ frontend khi cần. Tên, địa chỉ, bản đồ và liên hệ được cấu hình riêng trong `frontend/.env`.

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

Frontend mặc định dùng `/api` và Vite chuyển tiếp sang Spring Boot ở cổng `8080`. Nếu backend chạy ở địa chỉ khác, đặt biến sau trong `frontend/.env`:

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
