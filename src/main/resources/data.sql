-- Complete sample dataset for a fresh Hotel Management System database.
-- This script runs at every startup (spring.sql.init.mode=always), so every
-- row uses a stable primary key and INSERT IGNORE to avoid duplicating seed data.
-- The sample accounts all use the BCrypt hash for: hotel-demo-2026

-- 1. Users and joined inheritance tables: 1 admin, 1 receptionist, 3 customers.
INSERT IGNORE INTO users (id, username, password, full_name, email, phone, role, account_status, created_at, updated_at) VALUES
(1001, 'demo.admin', '$2a$10$rNBgylG6jffoxn2heRqQ6.bfuP4H5TjvZO/tgI0SUsp6Lwn2TqcdC', 'Nguyễn Minh Anh', 'admin@hotel.demo', '0901000001', 'ROLE_ADMIN', 'ACTIVE', NOW(), NOW()),
(1002, 'demo.reception', '$2a$10$rNBgylG6jffoxn2heRqQ6.bfuP4H5TjvZO/tgI0SUsp6Lwn2TqcdC', 'Trần Thu Hà', 'reception@hotel.demo', '0901000002', 'ROLE_RECEPTIONIST', 'ACTIVE', NOW(), NOW()),
(1003, 'demo.customer1', '$2a$10$rNBgylG6jffoxn2heRqQ6.bfuP4H5TjvZO/tgI0SUsp6Lwn2TqcdC', 'Lê Hoàng Nam', 'nam@hotel.demo', '0901000003', 'ROLE_CUSTOMER', 'ACTIVE', NOW(), NOW()),
(1004, 'demo.customer2', '$2a$10$rNBgylG6jffoxn2heRqQ6.bfuP4H5TjvZO/tgI0SUsp6Lwn2TqcdC', 'Phạm Ngọc Linh', 'linh@hotel.demo', '0901000004', 'ROLE_CUSTOMER', 'ACTIVE', NOW(), NOW()),
(1005, 'demo.customer3', '$2a$10$rNBgylG6jffoxn2heRqQ6.bfuP4H5TjvZO/tgI0SUsp6Lwn2TqcdC', 'Vũ Quốc Bảo', 'bao@hotel.demo', '0901000005', 'ROLE_CUSTOMER', 'ACTIVE', NOW(), NOW());

INSERT IGNORE INTO employees (id, employee_code, salary, hire_date) VALUES
(1001, 'EMP-ADMIN-001', 25000000, '2024-01-15'),
(1002, 'EMP-FD-001', 14000000, '2024-06-01');
INSERT IGNORE INTO admins (id, permissions) VALUES (1001, 'ALL');
INSERT IGNORE INTO receptionists (id, desk_number) VALUES (1002, 1);
INSERT IGNORE INTO customers (id, identity_card, address) VALUES
(1003, '001203000001', '12 Nguyễn Trãi, Hà Đông, Hà Nội'),
(1004, '001204000002', '25 Trần Phú, Hà Đông, Hà Nội'),
(1005, '001205000003', '8 Quang Trung, Hà Đông, Hà Nội');

-- 2. Room catalog, physical rooms and hotel services.
INSERT IGNORE INTO room_types (id, name, base_price, capacity, description, image_url, area_sqm, amenities, created_at, updated_at) VALUES
(1001, 'Standard Single', 650000, 1, 'Phòng tiêu chuẩn tiện nghi cho khách đi công tác hoặc lưu trú ngắn ngày.', 'https://images.unsplash.com/photo-1611892440504-42a792e24d32?auto=format&fit=crop&w=1200&q=85', 22, 'Wi-Fi,Điều hòa,TV thông minh,Bàn làm việc,Phòng tắm riêng', NOW(), NOW()),
(1002, 'Standard Double', 890000, 2, 'Phòng giường đôi phù hợp cho hai khách.', 'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=1200&q=85', 28, 'Wi-Fi,Điều hòa,TV thông minh,Ấm đun nước,Phòng tắm riêng', NOW(), NOW()),
(1003, 'Deluxe Suite', 1650000, 4, 'Phòng suite rộng có khu vực tiếp khách.', 'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=1200&q=85', 45, 'Wi-Fi,Điều hòa,TV thông minh,Minibar,Góc tiếp khách,Bồn tắm', NOW(), NOW()),
(1004, 'Presidential Suite', 3900000, 6, 'Suite cao cấp dành cho gia đình hoặc nhóm khách.', 'https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&w=1200&q=85', 85, 'Wi-Fi,Điều hòa,TV thông minh,Minibar,Phòng khách,Bồn tắm,Bàn ăn', NOW(), NOW());

INSERT IGNORE INTO service_items (id, name, unit_price, unit, active, created_at, updated_at) VALUES
(1001, 'Bữa sáng tại phòng', 180000, 'suất', true, NOW(), NOW()),
(1002, 'Giặt ủi', 70000, 'kg', true, NOW(), NOW()),
(1003, 'Nước minibar', 45000, 'lon', true, NOW(), NOW()),
(1004, 'Đưa đón sân bay', 450000, 'chuyến', true, NOW(), NOW()),
(1005, 'Massage tại phòng', 850000, 'giờ', true, NOW(), NOW()),
(1006, 'Gọi nhân viên hỗ trợ', 0, 'lần', true, NOW(), NOW()),
(1007, 'Bữa trưa tại phòng', 220000, 'suất', true, NOW(), NOW()),
(1008, 'Bữa tối tại phòng', 280000, 'suất', true, NOW(), NOW());

INSERT IGNORE INTO rooms (id, room_number, floor, status, operational, room_type_id, created_at, updated_at) VALUES
(1001, '101', 1, 'AVAILABLE', true, 1001, NOW(), NOW()),
(1002, '102', 1, 'AVAILABLE', true, 1001, NOW(), NOW()),
(1003, '201', 2, 'AVAILABLE', true, 1002, NOW(), NOW()),
(1004, '202', 2, 'AVAILABLE', true, 1002, NOW(), NOW()),
(1005, '203', 2, 'AVAILABLE', true, 1002, NOW(), NOW()),
(1006, '301', 3, 'OCCUPIED', true, 1003, NOW(), NOW()),
(1007, '302', 3, 'AVAILABLE', true, 1003, NOW(), NOW()),
(1008, '401', 4, 'AVAILABLE', true, 1004, NOW(), NOW()),
(1009, '402', 4, 'AVAILABLE', true, 1004, NOW(), NOW()),
(1010, '501', 5, 'CLEANING', true, 1003, NOW(), NOW()),
(1011, '601', 6, 'MAINTENANCE', true, 1004, NOW(), NOW()),
(1012, '103', 1, 'AVAILABLE', true, 1002, NOW(), NOW());

INSERT IGNORE INTO room_services (room_id, service_item_id)
SELECT r.id, s.id FROM rooms r CROSS JOIN service_items s
WHERE r.id BETWEEN 1001 AND 1012 AND s.id IN (1001, 1002, 1003, 1006, 1007, 1008);
INSERT IGNORE INTO room_services (room_id, service_item_id)
SELECT r.id, s.id FROM rooms r CROSS JOIN service_items s
WHERE r.id IN (1005, 1006, 1007, 1008, 1009) AND s.id IN (1004, 1005);

-- 3. Bookings illustrate the main lifecycle; dates are relative to install day.
-- Rooms are distinct for overlapping active bookings, so availability remains valid.
INSERT IGNORE INTO bookings (id, booking_code, customer_id, check_in_date, check_out_date, status,
    confirmed_at, checked_in_at, checked_out_at, cancelled_at, cancelled_by, cancellation_reason,
    rejection_reason, deposit_amount, deposit_rate, deposit_deadline, verification_deadline,
    transfer_content, deposit_reported_at, deposit_paid_at, expired_at, created_at, updated_at) VALUES
(1001, 'DEMO-BK-DEPOSIT', 1003, DATE_ADD(CURRENT_DATE, INTERVAL 3 DAY), DATE_ADD(CURRENT_DATE, INTERVAL 5 DAY), 'PENDING_DEPOSIT',
    NULL, NULL, NULL, NULL, NULL, NULL, NULL, 534000, 0.3000, DATE_ADD(UTC_TIMESTAMP(), INTERVAL 15 MINUTE), NULL,
    'DEMO-BK-DEPOSIT', NULL, NULL, NULL, NOW(), NOW()),
(1002, 'DEMO-BK-VERIFY', 1004, DATE_ADD(CURRENT_DATE, INTERVAL 4 DAY), DATE_ADD(CURRENT_DATE, INTERVAL 6 DAY), 'PENDING_VERIFICATION',
    NULL, NULL, NULL, NULL, NULL, NULL, NULL, 390000, 0.3000, NULL, DATE_ADD(UTC_TIMESTAMP(), INTERVAL 30 MINUTE),
    'DEMO-BK-VERIFY', UTC_TIMESTAMP(), NULL, NULL, NOW(), NOW()),
(1003, 'DEMO-BK-CONFIRMED', 1003, DATE_ADD(CURRENT_DATE, INTERVAL 10 DAY), DATE_ADD(CURRENT_DATE, INTERVAL 12 DAY), 'CONFIRMED',
    NOW(), NULL, NULL, NULL, NULL, NULL, NULL, 534000, 0.3000, NULL, NULL,
    'DEMO-BK-CONFIRMED', NULL, UTC_TIMESTAMP(), NULL, NOW(), NOW()),
(1004, 'DEMO-BK-INHOUSE', 1004, CURRENT_DATE, DATE_ADD(CURRENT_DATE, INTERVAL 2 DAY), 'CHECKED_IN',
    NOW(), NOW(), NULL, NULL, NULL, NULL, NULL, 1098000, 0.3000, NULL, NULL,
    'DEMO-BK-INHOUSE', NULL, UTC_TIMESTAMP(), NULL, NOW(), NOW()),
(1005, 'DEMO-BK-COMPLETED', 1003, DATE_SUB(CURRENT_DATE, INTERVAL 10 DAY), DATE_SUB(CURRENT_DATE, INTERVAL 8 DAY), 'COMPLETED',
    DATE_SUB(NOW(), INTERVAL 10 DAY), DATE_SUB(NOW(), INTERVAL 10 DAY), DATE_SUB(NOW(), INTERVAL 8 DAY), NULL, NULL, NULL, NULL,
    432000, 0.3000, NULL, NULL, 'DEMO-BK-COMPLETED', NULL, DATE_SUB(UTC_TIMESTAMP(), INTERVAL 10 DAY), NULL, NOW(), NOW()),
(1006, 'DEMO-BK-CANCELLED', 1005, DATE_ADD(CURRENT_DATE, INTERVAL 5 DAY), DATE_ADD(CURRENT_DATE, INTERVAL 7 DAY), 'CANCELLED',
    NULL, NULL, NULL, NOW(), 'demo.customer3', 'Khách thay đổi kế hoạch', NULL, 0, 0.3000, NULL, NULL,
    NULL, NULL, NULL, NULL, NOW(), NOW()),
(1007, 'DEMO-BK-EXPIRED', 1005, DATE_ADD(CURRENT_DATE, INTERVAL 1 DAY), DATE_ADD(CURRENT_DATE, INTERVAL 2 DAY), 'EXPIRED',
    NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0, 0.3000, NULL, NULL, NULL, NULL, NULL, UTC_TIMESTAMP(), NOW(), NOW()),
(1008, 'DEMO-BK-MULTI', 1005, DATE_ADD(CURRENT_DATE, INTERVAL 20 DAY), DATE_ADD(CURRENT_DATE, INTERVAL 22 DAY), 'PENDING',
    NULL, NULL, NULL, NULL, NULL, NULL, NULL, 0, 0.3000, NULL, NULL, NULL, NULL, NULL, NULL, NOW(), NOW()),
(1009, 'DEMO-BK-REJECTED', 1003, DATE_ADD(CURRENT_DATE, INTERVAL 8 DAY), DATE_ADD(CURRENT_DATE, INTERVAL 9 DAY), 'REJECTED',
    NULL, NULL, NULL, NULL, NULL, NULL, 'Không còn phòng phù hợp với yêu cầu', 0, 0.3000, NULL, NULL, NULL, NULL, NULL, NULL, NOW(), NOW()),
(1010, 'DEMO-BK-NOSHOW', 1004, DATE_SUB(CURRENT_DATE, INTERVAL 5 DAY), DATE_SUB(CURRENT_DATE, INTERVAL 3 DAY), 'NO_SHOW',
    DATE_SUB(NOW(), INTERVAL 6 DAY), NULL, NULL, NULL, NULL, NULL, NULL, 267000, 0.3000, NULL, NULL, 'DEMO-BK-NOSHOW', NULL, NULL, NULL, NOW(), NOW());

INSERT IGNORE INTO booking_details (id, booking_id, room_id, price_per_night, guest_count, created_at, updated_at) VALUES
(1001, 1001, 1003, 890000, 2, NOW(), NOW()),
(1002, 1002, 1001, 650000, 1, NOW(), NOW()),
(1003, 1003, 1004, 890000, 2, NOW(), NOW()),
(1004, 1004, 1006, 1650000, 2, NOW(), NOW()),
(1005, 1005, 1002, 650000, 1, NOW(), NOW()),
(1006, 1006, 1007, 1650000, 2, NOW(), NOW()),
(1007, 1007, 1009, 3900000, 4, NOW(), NOW()),
(1008, 1008, 1008, 3900000, 4, NOW(), NOW()),
(1009, 1008, 1005, 890000, 2, NOW(), NOW()),
(1010, 1009, 1009, 3900000, 4, NOW(), NOW()),
(1011, 1010, 1012, 890000, 2, NOW(), NOW());

-- 4. Room blocks, including one future maintenance window.
INSERT IGNORE INTO room_blocks (id, room_id, start_date, end_date, reason, created_at, updated_at) VALUES
(1001, 1011, DATE_ADD(CURRENT_DATE, INTERVAL 14 DAY), DATE_ADD(CURRENT_DATE, INTERVAL 17 DAY), 'Bảo trì định kỳ hệ thống điều hòa', NOW(), NOW()),
(1002, 1010, DATE_ADD(CURRENT_DATE, INTERVAL 1 DAY), DATE_ADD(CURRENT_DATE, INTERVAL 2 DAY), 'Vệ sinh sâu sau đợt lưu trú', NOW(), NOW());

-- 5. Service requests cover approved, pending and rejected states.
INSERT IGNORE INTO service_orders (id, booking_id, booking_detail_id, service_item_id, quantity, sub_total, unit_price,
    cancelled, cancelled_at, cancellation_reason, ordered_at, approval_status, created_at, updated_at) VALUES
(1001, 1004, 1004, 1001, 2, 360000, 180000, false, NULL, NULL, NOW(), 'APPROVED', NOW(), NOW()),
(1002, 1004, 1004, 1003, 1, 45000, 45000, false, NULL, NULL, NOW(), 'PENDING', NOW(), NOW()),
(1003, 1005, 1005, 1002, 2, 140000, 70000, false, NULL, NULL, DATE_SUB(NOW(), INTERVAL 9 DAY), 'APPROVED', NOW(), NOW()),
(1004, 1003, 1003, 1004, 1, 450000, 450000, false, NULL, NULL, NOW(), 'REJECTED', NOW(), NOW());

-- 6. Two sample invoices: one unpaid/in-house and one paid/completed.
INSERT IGNORE INTO invoices (id, booking_id, room_amount, service_amount, tax, surcharge, discount, total_amount,
    invoice_status, payment_method, is_paid, paid_at, created_at, updated_at) VALUES
(1001, 1004, 3300000, 360000, 0, 0, 0, 3660000, 'ISSUED', NULL, false, NULL, NOW(), NOW()),
(1002, 1005, 1300000, 140000, 0, 0, 0, 1440000, 'PAID', 'CASH', true, DATE_SUB(NOW(), INTERVAL 8 DAY), NOW(), NOW());

INSERT IGNORE INTO invoice_items (id, invoice_id, item_type, description, quantity, unit_price, line_total, created_at, updated_at) VALUES
(1001, 1001, 'ROOM', 'Phòng Deluxe Suite 301 - 2 đêm', 2, 1650000, 3300000, NOW(), NOW()),
(1002, 1001, 'SERVICE', 'Bữa sáng tại phòng', 2, 180000, 360000, NOW(), NOW()),
(1003, 1002, 'ROOM', 'Phòng Standard Single 102 - 2 đêm', 2, 650000, 1300000, NOW(), NOW()),
(1004, 1002, 'SERVICE', 'Giặt ủi', 2, 70000, 140000, NOW(), NOW());

-- Deposits and balance payments use unique idempotency keys and transaction references.
INSERT IGNORE INTO payments (id, invoice_id, booking_id, payment_type, amount, method, status, idempotency_key,
    reference, confirmed_transaction_reference, paid_at, reported_at, confirmed_by, created_at, updated_at) VALUES
(1001, NULL, 1001, 'DEPOSIT', 534000, 'BANK_TRANSFER', 'PENDING', 'SEED-DEPOSIT-DEMO-BK-DEPOSIT', NULL, NULL, NULL, NULL, NULL, NOW(), NOW()),
(1002, NULL, 1002, 'DEPOSIT', 390000, 'BANK_TRANSFER', 'REPORTED', 'SEED-DEPOSIT-DEMO-BK-VERIFY', 'Khách báo đã chuyển khoản', NULL, NULL, NOW(), NULL, NOW(), NOW()),
(1003, NULL, 1003, 'DEPOSIT', 534000, 'BANK_TRANSFER', 'SUCCESSFUL', 'SEED-DEPOSIT-DEMO-BK-CONFIRMED', 'SEED-TXN-0003', 'SEED-TXN-0003', DATE_SUB(NOW(), INTERVAL 1 DAY), NULL, 'demo.reception', NOW(), NOW()),
(1004, NULL, 1004, 'DEPOSIT', 1098000, 'BANK_TRANSFER', 'SUCCESSFUL', 'SEED-DEPOSIT-DEMO-BK-INHOUSE', 'SEED-TXN-0004', 'SEED-TXN-0004', DATE_SUB(NOW(), INTERVAL 1 DAY), NULL, 'demo.reception', NOW(), NOW()),
(1005, NULL, 1005, 'DEPOSIT', 432000, 'BANK_TRANSFER', 'SUCCESSFUL', 'SEED-DEPOSIT-DEMO-BK-COMPLETED', 'SEED-TXN-0005', 'SEED-TXN-0005', DATE_SUB(NOW(), INTERVAL 10 DAY), NULL, 'demo.reception', NOW(), NOW()),
(1006, 1002, 1005, 'BALANCE', 1008000, 'CASH', 'SUCCESSFUL', 'SEED-BALANCE-DEMO-BK-COMPLETED', 'SEED-CASH-0006', NULL, DATE_SUB(NOW(), INTERVAL 8 DAY), NULL, 'demo.reception', NOW(), NOW());
