-- ============================================================================
-- Hoàng Gia Hotel — Full MySQL 8+ Database Schema (20 Tables)
-- Bao gồm đầy đủ các bảng nghiệp vụ quản lý khách sạn & bộ sưu tập ảnh phòng.
-- Thứ tự chạy trên MySQL Workbench / CLI:
--   1. Chạy file database/schema.sql
--   2. Chạy file database/data.sql
-- ============================================================================

CREATE DATABASE IF NOT EXISTS hotel_management
  CHARACTER SET utf8mb4
  COLLATE utf8mb4_unicode_ci;

USE hotel_management;

SET NAMES utf8mb4;
SET FOREIGN_KEY_CHECKS = 0;

-- ----------------------------------------------------------------------------
-- 1. Nhóm Tài khoản & Phân quyền (users -> customers / employees -> admins / receptionists)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS users (
  id BIGINT NOT NULL AUTO_INCREMENT,
  username VARCHAR(50) NOT NULL,
  password_hash VARCHAR(255) NOT NULL,
  full_name VARCHAR(150) NOT NULL,
  email VARCHAR(150) NOT NULL,
  phone VARCHAR(30) NULL,
  role VARCHAR(30) NOT NULL,
  account_status VARCHAR(20) NOT NULL DEFAULT 'ACTIVE',
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (id),
  UNIQUE KEY uk_users_username (username),
  UNIQUE KEY uk_users_email (email),
  KEY idx_users_role_status (role, account_status)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS customers (
  id BIGINT NOT NULL,
  identity_card VARCHAR(50) NULL,
  address VARCHAR(255) NULL,
  loyalty_points INT NOT NULL DEFAULT 0,
  PRIMARY KEY (id),
  CONSTRAINT fk_customers_user
    FOREIGN KEY (id) REFERENCES users (id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS employees (
  id BIGINT NOT NULL,
  employee_code VARCHAR(50) NOT NULL,
  salary DECIMAL(15, 2) NULL,
  hire_date DATE NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uk_employees_code (employee_code),
  CONSTRAINT fk_employees_user
    FOREIGN KEY (id) REFERENCES users (id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS admins (
  id BIGINT NOT NULL,
  admin_level VARCHAR(50) NOT NULL DEFAULT 'SUPER_ADMIN',
  PRIMARY KEY (id),
  CONSTRAINT fk_admins_employee
    FOREIGN KEY (id) REFERENCES employees (id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS receptionists (
  id BIGINT NOT NULL,
  desk_number INT NOT NULL DEFAULT 1,
  PRIMARY KEY (id),
  CONSTRAINT fk_receptionists_employee
    FOREIGN KEY (id) REFERENCES employees (id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 2. Nhóm Danh mục Phòng, Ảnh, Dịch vụ & Chặn lịch
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS room_types (
  id BIGINT NOT NULL AUTO_INCREMENT,
  name VARCHAR(120) NOT NULL,
  base_price DECIMAL(15, 2) NOT NULL,
  capacity INT NOT NULL,
  description TEXT NULL,
  image_url VARCHAR(500) NULL,
  area_sqm INT NULL,
  amenities TEXT NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uk_room_types_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS room_type_images (
  id BIGINT NOT NULL AUTO_INCREMENT,
  room_type_id BIGINT NOT NULL,
  image_url VARCHAR(500) NOT NULL,
  caption VARCHAR(255) NULL,
  display_order INT NOT NULL DEFAULT 1,
  PRIMARY KEY (id),
  KEY idx_room_type_images_type_order (room_type_id, display_order),
  CONSTRAINT fk_room_type_images_room_type
    FOREIGN KEY (room_type_id) REFERENCES room_types (id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS service_items (
  id BIGINT NOT NULL AUTO_INCREMENT,
  name VARCHAR(150) NOT NULL,
  unit_price DECIMAL(15, 2) NOT NULL,
  unit VARCHAR(50) NOT NULL,
  active TINYINT(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (id),
  UNIQUE KEY uk_service_items_name (name)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS rooms (
  id BIGINT NOT NULL AUTO_INCREMENT,
  room_number VARCHAR(20) NOT NULL,
  floor INT NOT NULL,
  room_type_id BIGINT NOT NULL,
  status VARCHAR(30) NOT NULL DEFAULT 'AVAILABLE',
  operational TINYINT(1) NOT NULL DEFAULT 1,
  PRIMARY KEY (id),
  UNIQUE KEY uk_rooms_number (room_number),
  KEY idx_rooms_type_status (room_type_id, status),
  CONSTRAINT fk_rooms_room_type
    FOREIGN KEY (room_type_id) REFERENCES room_types (id)
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS room_images (
  id BIGINT NOT NULL AUTO_INCREMENT,
  room_id BIGINT NOT NULL,
  image_url VARCHAR(500) NOT NULL,
  caption VARCHAR(255) NULL,
  display_order INT NOT NULL DEFAULT 1,
  PRIMARY KEY (id),
  KEY idx_room_images_room_order (room_id, display_order),
  CONSTRAINT fk_room_images_room
    FOREIGN KEY (room_id) REFERENCES rooms (id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS room_services (
  room_id BIGINT NOT NULL,
  service_item_id BIGINT NOT NULL,
  PRIMARY KEY (room_id, service_item_id),
  KEY idx_room_services_service (service_item_id),
  CONSTRAINT fk_room_services_room
    FOREIGN KEY (room_id) REFERENCES rooms (id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_room_services_service
    FOREIGN KEY (service_item_id) REFERENCES service_items (id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS room_blocks (
  id BIGINT NOT NULL AUTO_INCREMENT,
  room_id BIGINT NOT NULL,
  start_date DATE NOT NULL,
  end_date DATE NOT NULL,
  reason VARCHAR(255) NOT NULL,
  PRIMARY KEY (id),
  KEY idx_room_blocks_room_dates (room_id, start_date, end_date),
  CONSTRAINT fk_room_blocks_room
    FOREIGN KEY (room_id) REFERENCES rooms (id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 3. Cấu hình chiến lược giá
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS pricing_configurations (
  id BIGINT NOT NULL AUTO_INCREMENT,
  strategy VARCHAR(30) NOT NULL,
  multiplier DECIMAL(8, 4) NOT NULL,
  default_multiplier DECIMAL(8, 4) NOT NULL,
  updated_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6) ON UPDATE CURRENT_TIMESTAMP(6),
  PRIMARY KEY (id),
  UNIQUE KEY uk_pricing_strategy (strategy)
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 4. Nhóm Đặt phòng, Chi tiết phòng & Gọi dịch vụ
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS bookings (
  id BIGINT NOT NULL AUTO_INCREMENT,
  booking_code VARCHAR(40) NOT NULL,
  customer_id BIGINT NOT NULL,
  check_in_date DATE NOT NULL,
  check_out_date DATE NOT NULL,
  status VARCHAR(30) NOT NULL,
  deposit_amount DECIMAL(15, 2) NULL,
  deposit_rate DECIMAL(6, 4) NULL,
  deposit_deadline DATETIME(6) NULL,
  verification_deadline DATETIME(6) NULL,
  deposit_reported_at DATETIME(6) NULL,
  transfer_content VARCHAR(120) NULL,
  deposit_paid_at DATETIME(6) NULL,
  deposit_confirmed_by VARCHAR(50) NULL,
  expired_at DATETIME(6) NULL,
  confirmed_at DATETIME(6) NULL,
  checked_in_at DATETIME(6) NULL,
  checked_out_at DATETIME(6) NULL,
  cancelled_at DATETIME(6) NULL,
  cancelled_by VARCHAR(50) NULL,
  cancellation_reason VARCHAR(500) NULL,
  rejection_reason VARCHAR(500) NULL,
  cancellation_free_hours_snapshot INT NULL,
  cancellation_partial_hours_snapshot INT NULL,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (id),
  UNIQUE KEY uk_bookings_code (booking_code),
  KEY idx_bookings_customer_status (customer_id, status),
  KEY idx_bookings_dates_status (check_in_date, check_out_date, status),
  CONSTRAINT fk_bookings_customer
    FOREIGN KEY (customer_id) REFERENCES customers (id)
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS booking_details (
  id BIGINT NOT NULL AUTO_INCREMENT,
  booking_id BIGINT NOT NULL,
  room_id BIGINT NOT NULL,
  price_per_night DECIMAL(15, 2) NOT NULL,
  guest_count INT NOT NULL DEFAULT 1,
  PRIMARY KEY (id),
  KEY idx_booking_details_booking (booking_id),
  KEY idx_booking_details_room (room_id),
  CONSTRAINT fk_booking_details_booking
    FOREIGN KEY (booking_id) REFERENCES bookings (id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_booking_details_room
    FOREIGN KEY (room_id) REFERENCES rooms (id)
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS service_orders (
  id BIGINT NOT NULL AUTO_INCREMENT,
  booking_id BIGINT NOT NULL,
  booking_detail_id BIGINT NULL,
  service_item_id BIGINT NOT NULL,
  quantity INT NOT NULL,
  unit_price DECIMAL(15, 2) NOT NULL,
  approval_status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
  cancelled TINYINT(1) NOT NULL DEFAULT 0,
  ordered_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  cancelled_at DATETIME(6) NULL,
  cancellation_reason VARCHAR(500) NULL,
  PRIMARY KEY (id),
  KEY idx_service_orders_booking_status (booking_id, approval_status, cancelled),
  CONSTRAINT fk_service_orders_booking
    FOREIGN KEY (booking_id) REFERENCES bookings (id)
    ON DELETE CASCADE ON UPDATE CASCADE,
  CONSTRAINT fk_service_orders_detail
    FOREIGN KEY (booking_detail_id) REFERENCES booking_details (id)
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT fk_service_orders_item
    FOREIGN KEY (service_item_id) REFERENCES service_items (id)
    ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

-- ----------------------------------------------------------------------------
-- 5. Nhóm Hóa đơn, Thanh toán & Hoàn tiền
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS invoices (
  id BIGINT NOT NULL AUTO_INCREMENT,
  booking_id BIGINT NOT NULL,
  room_amount DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
  service_amount DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
  tax DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
  surcharge DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
  discount DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
  total_amount DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
  successful_payments DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
  balance_due DECIMAL(15, 2) NOT NULL DEFAULT 0.00,
  status VARCHAR(20) NOT NULL DEFAULT 'DRAFT',
  payment_method VARCHAR(30) NULL,
  is_paid TINYINT(1) NOT NULL DEFAULT 0,
  paid_at DATETIME(6) NULL,
  PRIMARY KEY (id),
  UNIQUE KEY uk_invoices_booking (booking_id),
  CONSTRAINT fk_invoices_booking
    FOREIGN KEY (booking_id) REFERENCES bookings (id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS invoice_items (
  id BIGINT NOT NULL AUTO_INCREMENT,
  invoice_id BIGINT NOT NULL,
  type VARCHAR(20) NOT NULL,
  description VARCHAR(255) NOT NULL,
  quantity INT NOT NULL DEFAULT 1,
  unit_price DECIMAL(15, 2) NOT NULL,
  line_total DECIMAL(15, 2) NOT NULL,
  PRIMARY KEY (id),
  KEY idx_invoice_items_invoice (invoice_id),
  CONSTRAINT fk_invoice_items_invoice
    FOREIGN KEY (invoice_id) REFERENCES invoices (id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS payments (
  id BIGINT NOT NULL AUTO_INCREMENT,
  booking_id BIGINT NULL,
  invoice_id BIGINT NULL,
  type VARCHAR(20) NOT NULL,
  amount DECIMAL(15, 2) NOT NULL,
  method VARCHAR(30) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
  idempotency_key VARCHAR(120) NOT NULL,
  reference VARCHAR(255) NULL,
  confirmed_transaction_reference VARCHAR(255) NULL,
  confirmed_by VARCHAR(50) NULL,
  reported_at DATETIME(6) NULL,
  paid_at DATETIME(6) NULL,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (id),
  UNIQUE KEY uk_payments_idempotency (idempotency_key),
  KEY idx_payments_booking (booking_id),
  KEY idx_payments_invoice (invoice_id),
  CONSTRAINT fk_payments_booking
    FOREIGN KEY (booking_id) REFERENCES bookings (id)
    ON DELETE SET NULL ON UPDATE CASCADE,
  CONSTRAINT fk_payments_invoice
    FOREIGN KEY (invoice_id) REFERENCES invoices (id)
    ON DELETE SET NULL ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

CREATE TABLE IF NOT EXISTS refunds (
  id BIGINT NOT NULL AUTO_INCREMENT,
  booking_id BIGINT NOT NULL,
  code VARCHAR(60) NOT NULL,
  amount DECIMAL(15, 2) NOT NULL,
  status VARCHAR(20) NOT NULL DEFAULT 'PENDING',
  reference VARCHAR(255) NULL,
  completed_at DATETIME(6) NULL,
  created_at DATETIME(6) NOT NULL DEFAULT CURRENT_TIMESTAMP(6),
  PRIMARY KEY (id),
  UNIQUE KEY uk_refunds_code (code),
  KEY idx_refunds_booking_status (booking_id, status),
  CONSTRAINT fk_refunds_booking
    FOREIGN KEY (booking_id) REFERENCES bookings (id)
    ON DELETE CASCADE ON UPDATE CASCADE
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_unicode_ci;

SET FOREIGN_KEY_CHECKS = 1;
