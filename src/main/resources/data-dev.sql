-- Development-only demo accounts. Password for all three accounts: hotel-demo-2026
-- BCrypt hash generated with Spring Security BCryptPasswordEncoder (strength 10).
INSERT INTO users (username, password, full_name, email, phone, role, account_status, created_at, updated_at)
SELECT 'demo.reception', '$2a$10$rNBgylG6jffoxn2heRqQ6.bfuP4H5TjvZO/tgI0SUsp6Lwn2TqcdC', 'Demo Receptionist', 'demo.reception@hotel.local', '0900000001', 'ROLE_RECEPTIONIST', 'ACTIVE', NOW(), NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM users WHERE username = 'demo.reception');

INSERT INTO users (username, password, full_name, email, phone, role, account_status, created_at, updated_at)
SELECT 'demo.customer1', '$2a$10$rNBgylG6jffoxn2heRqQ6.bfuP4H5TjvZO/tgI0SUsp6Lwn2TqcdC', 'Demo Customer One', 'demo.customer1@hotel.local', '0900000002', 'ROLE_CUSTOMER', 'ACTIVE', NOW(), NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM users WHERE username = 'demo.customer1');

INSERT INTO users (username, password, full_name, email, phone, role, account_status, created_at, updated_at)
SELECT 'demo.customer2', '$2a$10$rNBgylG6jffoxn2heRqQ6.bfuP4H5TjvZO/tgI0SUsp6Lwn2TqcdC', 'Demo Customer Two', 'demo.customer2@hotel.local', '0900000003', 'ROLE_CUSTOMER', 'ACTIVE', NOW(), NOW()
FROM DUAL WHERE NOT EXISTS (SELECT 1 FROM users WHERE username = 'demo.customer2');

INSERT INTO employees (id, employee_code, salary, hire_date)
SELECT u.id, 'DEMO-FD-01', 12000000, CURRENT_DATE
FROM users u WHERE u.username = 'demo.reception'
AND NOT EXISTS (SELECT 1 FROM employees e WHERE e.id = u.id);

INSERT INTO receptionists (id, desk_number)
SELECT u.id, 1
FROM users u WHERE u.username = 'demo.reception'
AND NOT EXISTS (SELECT 1 FROM receptionists r WHERE r.id = u.id);

INSERT INTO customers (id, identity_card, address)
SELECT u.id, 'DEMO-ID-0001', '1 Example Street, Ho Chi Minh City'
FROM users u WHERE u.username = 'demo.customer1'
AND NOT EXISTS (SELECT 1 FROM customers c WHERE c.id = u.id);

INSERT INTO customers (id, identity_card, address)
SELECT u.id, 'DEMO-ID-0002', '2 Example Street, Ho Chi Minh City'
FROM users u WHERE u.username = 'demo.customer2'
AND NOT EXISTS (SELECT 1 FROM customers c WHERE c.id = u.id);

-- Sample booking lifecycle records. Room/date ranges do not overlap for the same room.
INSERT INTO bookings (booking_code, customer_id, check_in_date, check_out_date, status, created_at, updated_at)
SELECT 'DEMO-BK-PENDING', u.id, DATE_ADD(CURRENT_DATE, INTERVAL 2 DAY), DATE_ADD(CURRENT_DATE, INTERVAL 4 DAY), 'PENDING', NOW(), NOW()
FROM users u WHERE u.username = 'demo.customer1'
AND NOT EXISTS (SELECT 1 FROM bookings b WHERE b.booking_code = 'DEMO-BK-PENDING');

INSERT INTO bookings (booking_code, customer_id, check_in_date, check_out_date, status, confirmed_at, created_at, updated_at)
SELECT 'DEMO-BK-CONFIRMED', u.id, DATE_ADD(CURRENT_DATE, INTERVAL 7 DAY), DATE_ADD(CURRENT_DATE, INTERVAL 9 DAY), 'CONFIRMED', NOW(), NOW(), NOW()
FROM users u WHERE u.username = 'demo.customer1'
AND NOT EXISTS (SELECT 1 FROM bookings b WHERE b.booking_code = 'DEMO-BK-CONFIRMED');

INSERT INTO bookings (booking_code, customer_id, check_in_date, check_out_date, status, confirmed_at, checked_in_at, created_at, updated_at)
SELECT 'DEMO-BK-CHECKED-IN', u.id, CURRENT_DATE, DATE_ADD(CURRENT_DATE, INTERVAL 2 DAY), 'CHECKED_IN', NOW(), NOW(), NOW(), NOW()
FROM users u WHERE u.username = 'demo.customer2'
AND NOT EXISTS (SELECT 1 FROM bookings b WHERE b.booking_code = 'DEMO-BK-CHECKED-IN');

INSERT INTO bookings (booking_code, customer_id, check_in_date, check_out_date, status, confirmed_at, checked_in_at, checked_out_at, created_at, updated_at)
SELECT 'DEMO-BK-COMPLETED', u.id, DATE_SUB(CURRENT_DATE, INTERVAL 10 DAY), DATE_SUB(CURRENT_DATE, INTERVAL 8 DAY), 'COMPLETED', DATE_SUB(NOW(), INTERVAL 10 DAY), DATE_SUB(NOW(), INTERVAL 10 DAY), DATE_SUB(NOW(), INTERVAL 8 DAY), NOW(), NOW()
FROM users u WHERE u.username = 'demo.customer1'
AND NOT EXISTS (SELECT 1 FROM bookings b WHERE b.booking_code = 'DEMO-BK-COMPLETED');

INSERT INTO bookings (booking_code, customer_id, check_in_date, check_out_date, status, cancelled_at, cancelled_by, cancellation_reason, created_at, updated_at)
SELECT 'DEMO-BK-CANCELLED', u.id, DATE_ADD(CURRENT_DATE, INTERVAL 3 DAY), DATE_ADD(CURRENT_DATE, INTERVAL 5 DAY), 'CANCELLED', NOW(), 'demo.customer2', 'Seed example cancellation', NOW(), NOW()
FROM users u WHERE u.username = 'demo.customer2'
AND NOT EXISTS (SELECT 1 FROM bookings b WHERE b.booking_code = 'DEMO-BK-CANCELLED');

INSERT INTO bookings (booking_code, customer_id, check_in_date, check_out_date, status, rejection_reason, created_at, updated_at)
SELECT 'DEMO-BK-REJECTED', u.id, DATE_ADD(CURRENT_DATE, INTERVAL 4 DAY), DATE_ADD(CURRENT_DATE, INTERVAL 5 DAY), 'REJECTED', 'Seed example rejection', NOW(), NOW()
FROM users u WHERE u.username = 'demo.customer1'
AND NOT EXISTS (SELECT 1 FROM bookings b WHERE b.booking_code = 'DEMO-BK-REJECTED');

INSERT INTO bookings (booking_code, customer_id, check_in_date, check_out_date, status, created_at, updated_at)
SELECT 'DEMO-BK-MULTI-ROOM', u.id, DATE_ADD(CURRENT_DATE, INTERVAL 2 DAY), DATE_ADD(CURRENT_DATE, INTERVAL 4 DAY), 'PENDING', NOW(), NOW()
FROM users u WHERE u.username = 'demo.customer2'
AND NOT EXISTS (SELECT 1 FROM bookings b WHERE b.booking_code = 'DEMO-BK-MULTI-ROOM');

INSERT INTO booking_details (booking_id, room_id, price_per_night, guest_count, created_at, updated_at)
SELECT b.id, 1, 650000, 1, NOW(), NOW() FROM bookings b
WHERE b.booking_code = 'DEMO-BK-PENDING'
AND NOT EXISTS (SELECT 1 FROM booking_details d WHERE d.booking_id = b.id AND d.room_id = 1);
INSERT INTO booking_details (booking_id, room_id, price_per_night, guest_count, created_at, updated_at)
SELECT b.id, 2, 650000, 1, NOW(), NOW() FROM bookings b
WHERE b.booking_code = 'DEMO-BK-CONFIRMED'
AND NOT EXISTS (SELECT 1 FROM booking_details d WHERE d.booking_id = b.id AND d.room_id = 2);
INSERT INTO booking_details (booking_id, room_id, price_per_night, guest_count, created_at, updated_at)
SELECT b.id, 3, 890000, 2, NOW(), NOW() FROM bookings b
WHERE b.booking_code = 'DEMO-BK-CHECKED-IN'
AND NOT EXISTS (SELECT 1 FROM booking_details d WHERE d.booking_id = b.id AND d.room_id = 3);
INSERT INTO booking_details (booking_id, room_id, price_per_night, guest_count, created_at, updated_at)
SELECT b.id, 4, 890000, 2, NOW(), NOW() FROM bookings b
WHERE b.booking_code = 'DEMO-BK-COMPLETED'
AND NOT EXISTS (SELECT 1 FROM booking_details d WHERE d.booking_id = b.id AND d.room_id = 4);
INSERT INTO booking_details (booking_id, room_id, price_per_night, guest_count, created_at, updated_at)
SELECT b.id, 5, 1650000, 2, NOW(), NOW() FROM bookings b
WHERE b.booking_code = 'DEMO-BK-CANCELLED'
AND NOT EXISTS (SELECT 1 FROM booking_details d WHERE d.booking_id = b.id AND d.room_id = 5);
INSERT INTO booking_details (booking_id, room_id, price_per_night, guest_count, created_at, updated_at)
SELECT b.id, 6, 3900000, 4, NOW(), NOW() FROM bookings b
WHERE b.booking_code = 'DEMO-BK-REJECTED'
AND NOT EXISTS (SELECT 1 FROM booking_details d WHERE d.booking_id = b.id AND d.room_id = 6);
INSERT INTO booking_details (booking_id, room_id, price_per_night, guest_count, created_at, updated_at)
SELECT b.id, 7, 890000, 2, NOW(), NOW() FROM bookings b
WHERE b.booking_code = 'DEMO-BK-MULTI-ROOM'
AND NOT EXISTS (SELECT 1 FROM booking_details d WHERE d.booking_id = b.id AND d.room_id = 7);
INSERT INTO booking_details (booking_id, room_id, price_per_night, guest_count, created_at, updated_at)
SELECT b.id, 8, 890000, 1, NOW(), NOW() FROM bookings b
WHERE b.booking_code = 'DEMO-BK-MULTI-ROOM'
AND NOT EXISTS (SELECT 1 FROM booking_details d WHERE d.booking_id = b.id AND d.room_id = 8);

-- Match the one active stay's operational room status without resetting changed room states on restart.
UPDATE rooms SET status = 'OCCUPIED'
WHERE id = 3 AND status = 'AVAILABLE'
AND EXISTS (SELECT 1 FROM booking_details d JOIN bookings b ON b.id = d.booking_id WHERE d.room_id = 3 AND b.booking_code = 'DEMO-BK-CHECKED-IN' AND b.status = 'CHECKED_IN');
