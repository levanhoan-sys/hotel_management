-- NEXA Hà Đông sample data. Existing rows are kept when staff have edited them.
INSERT IGNORE INTO room_types (id, name, base_price, capacity, description, image_url, area_sqm, amenities, created_at, updated_at) VALUES
(1, 'Standard Single', 650000, 1, 'Phòng gọn gàng cho khách đi công tác tại Hà Đông.', 'https://images.unsplash.com/photo-1611892440504-42a792e24d32?auto=format&fit=crop&w=1200&q=85', 22, 'Wi-Fi tốc độ cao,Điều hòa,TV thông minh,Bàn làm việc,Phòng tắm riêng', NOW(), NOW()),
(2, 'Standard Double', 890000, 2, 'Phòng giường đôi ấm áp cho hai khách.', 'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=1200&q=85', 28, 'Wi-Fi tốc độ cao,Điều hòa,TV thông minh,Ấm đun nước,Phòng tắm riêng', NOW(), NOW()),
(3, 'Deluxe Suite', 1650000, 4, 'Không gian rộng với góc tiếp khách và tầm nhìn thành phố.', 'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=1200&q=85', 45, 'Wi-Fi tốc độ cao,Điều hòa,TV thông minh,Minibar,Góc tiếp khách,Bồn tắm', NOW(), NOW()),
(4, 'Presidential VIP', 3900000, 6, 'Căn suite cao cấp dành cho kỳ nghỉ gia đình tại Hà Nội.', 'https://images.unsplash.com/photo-1582719508461-905c673771fd?auto=format&fit=crop&w=1200&q=85', 85, 'Wi-Fi tốc độ cao,Điều hòa,TV thông minh,Minibar,Phòng khách,Bồn tắm,Bàn ăn', NOW(), NOW());

UPDATE room_types SET area_sqm = 22, amenities = 'Wi-Fi tốc độ cao,Điều hòa,TV thông minh,Bàn làm việc,Phòng tắm riêng' WHERE id = 1 AND area_sqm IS NULL AND amenities IS NULL;
UPDATE room_types SET area_sqm = 28, amenities = 'Wi-Fi tốc độ cao,Điều hòa,TV thông minh,Ấm đun nước,Phòng tắm riêng' WHERE id = 2 AND area_sqm IS NULL AND amenities IS NULL;
UPDATE room_types SET area_sqm = 45, amenities = 'Wi-Fi tốc độ cao,Điều hòa,TV thông minh,Minibar,Góc tiếp khách,Bồn tắm' WHERE id = 3 AND area_sqm IS NULL AND amenities IS NULL;
UPDATE room_types SET area_sqm = 85, amenities = 'Wi-Fi tốc độ cao,Điều hòa,TV thông minh,Minibar,Phòng khách,Bồn tắm,Bàn ăn' WHERE id = 4 AND area_sqm IS NULL AND amenities IS NULL;

INSERT IGNORE INTO rooms (id, room_number, floor, status, operational, room_type_id, created_at, updated_at) VALUES
(1, '101', 1, 'AVAILABLE', true, 1, NOW(), NOW()), (2, '102', 1, 'AVAILABLE', true, 1, NOW(), NOW()),
(3, '201', 2, 'AVAILABLE', true, 2, NOW(), NOW()), (4, '202', 2, 'AVAILABLE', true, 2, NOW(), NOW()),
(5, '301', 3, 'AVAILABLE', true, 3, NOW(), NOW()), (6, '401', 4, 'AVAILABLE', true, 4, NOW(), NOW()),
(7, '103', 1, 'AVAILABLE', true, 2, NOW(), NOW()), (8, '203', 2, 'AVAILABLE', true, 2, NOW(), NOW()),
(9, '302', 3, 'AVAILABLE', true, 3, NOW(), NOW()), (10, '402', 4, 'AVAILABLE', true, 4, NOW(), NOW()),
(11, '501', 5, 'AVAILABLE', true, 3, NOW(), NOW()), (12, '601', 6, 'AVAILABLE', true, 4, NOW(), NOW());

INSERT IGNORE INTO service_items (id, name, unit_price, unit, active, created_at, updated_at) VALUES
(1, 'Bữa sáng tại phòng', 180000, 'suất', true, NOW(), NOW()),
(2, 'Giặt ủi', 70000, 'kg', true, NOW(), NOW()),
(3, 'Nước giải khát minibar', 45000, 'lon', true, NOW(), NOW()),
(4, 'Đưa đón sân bay', 450000, 'chuyến', true, NOW(), NOW()),
(5, 'Massage tại phòng', 850000, 'giờ', true, NOW(), NOW()),
(6, 'Gọi nhân viên hỗ trợ', 0, 'lần', true, NOW(), NOW()),
(7, 'Bữa trưa tại phòng', 220000, 'suất', true, NOW(), NOW()),
(8, 'Bữa tối tại phòng', 280000, 'suất', true, NOW(), NOW());

UPDATE service_items SET name = 'Bữa sáng tại phòng', unit_price = 180000 WHERE id = 1 AND name = 'Bữa sáng Buffet Á-Âu';
UPDATE service_items SET name = 'Giặt ủi', unit_price = 70000 WHERE id = 2 AND name = 'Giặt ủi lấy nhanh';
UPDATE service_items SET name = 'Nước giải khát minibar', unit_price = 45000 WHERE id = 3 AND name = 'Nước giải khát Minibar';
UPDATE service_items SET name = 'Đưa đón sân bay', unit_price = 450000 WHERE id = 4 AND name = 'Dịch vụ Đưa đón sân bay';
UPDATE service_items SET name = 'Massage tại phòng', unit_price = 850000 WHERE id = 5 AND name = 'Massage & Spa Thảo dược';

INSERT IGNORE INTO room_services (room_id, service_item_id)
SELECT r.id, s.id FROM rooms r CROSS JOIN service_items s
WHERE r.id BETWEEN 1 AND 12 AND s.name IN ('Bữa sáng tại phòng', 'Giặt ủi', 'Nước giải khát minibar', 'Gọi nhân viên hỗ trợ', 'Bữa trưa tại phòng', 'Bữa tối tại phòng');
INSERT IGNORE INTO room_services (room_id, service_item_id)
SELECT r.id, s.id FROM rooms r CROSS JOIN service_items s
WHERE r.id IN (5, 6, 9, 10, 11, 12) AND s.name IN ('Đưa đón sân bay', 'Massage tại phòng');
