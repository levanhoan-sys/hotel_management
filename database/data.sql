-- ============================================================================
-- Hoàng Gia Hotel — Full MySQL Seed Data
-- Chạy file database/schema.sql trước khi import file này vào MySQL.
-- ============================================================================

USE hotel_management;
SET NAMES utf8mb4;

-- ----------------------------------------------------------------------------
-- 1. Room Types (4 hạng phòng)
-- ----------------------------------------------------------------------------
INSERT INTO room_types (id, name, base_price, capacity, description, image_url, area_sqm, amenities) VALUES
  (1, 'Standard Single', 650000, 1, 'Phòng gọn gàng cho khách đi công tác tại Hà Đông.', 'https://images.unsplash.com/photo-1611892440504-42a792e24d32?auto=format&fit=crop&w=1200&q=85', 22, 'Wi-Fi tốc độ cao,Điều hòa,TV thông minh,Bàn làm việc,Phòng tắm riêng'),
  (2, 'Standard Double', 890000, 2, 'Phòng giường đôi ấm áp cho hai khách.', 'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=1200&q=85', 28, 'Wi-Fi tốc độ cao,Điều hòa,TV thông minh,Ấm đun nước,Phòng tắm riêng'),
  (3, 'Deluxe Suite', 1650000, 4, 'Không gian rộng với góc tiếp khách và tầm nhìn thành phố.', 'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=1200&q=85', 45, 'Wi-Fi tốc độ cao,Điều hòa,TV thông minh,Minibar,Góc tiếp khách,Bồn tắm'),
  (4, 'Presidential VIP', 3900000, 6, 'Căn suite cao cấp dành cho kỳ nghỉ gia đình tại Hà Nội.', 'https://images.unsplash.com/photo-1512918728675-ed5a9ecdebfd?auto=format&fit=crop&w=1200&q=85', 85, 'Wi-Fi tốc độ cao,Điều hòa,TV thông minh,Minibar,Phòng khách,Bồn tắm,Bàn ăn');

-- ----------------------------------------------------------------------------
-- 2. Room Type Galleries (5 ảnh đồng bộ phong cách cho mỗi hạng phòng)
-- ----------------------------------------------------------------------------
INSERT INTO room_type_images (id, room_type_id, image_url, caption, display_order) VALUES
  -- Standard Single: Tông gỗ trầm ấm áp, ánh sáng dịu nhẹ dành cho khách công tác
  (1, 1, 'https://images.unsplash.com/photo-1611892440504-42a792e24d32?auto=format&fit=crop&w=1200&q=85', 'Không gian tổng thể phòng ngủ gỗ ấm áp', 1),
  (2, 1, 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=1200&q=85', 'Giường ngủ cùng băng ghế gỗ cuối giường', 2),
  (3, 1, 'https://images.unsplash.com/photo-1566665797739-1674de7a421a?auto=format&fit=crop&w=1200&q=85', 'Đầu giường ốp gỗ tối cùng đèn ngủ ấm áp', 3),
  (4, 1, 'https://images.unsplash.com/photo-1618773928121-c32242e63f39?auto=format&fit=crop&w=1200&q=85', 'Bàn đầu giường và hệ rèm chắn sáng yên tĩnh', 4),
  (5, 1, 'https://images.unsplash.com/photo-1507652313519-d4e9174996dd?auto=format&fit=crop&w=1200&q=85', 'Phòng tắm đá tự nhiên và bồn tắm thư giãn', 5),

  -- Standard Double: Tông kem sáng hiện đại kết hợp nội thất gỗ tự nhiên
  (6, 2, 'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=1200&q=85', 'Góc sinh hoạt và tiếp khách sáng thoáng', 1),
  (7, 2, 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?auto=format&fit=crop&w=1200&q=85', 'Phòng giường đôi cạnh cửa sổ đón nắng', 2),
  (8, 2, 'https://images.unsplash.com/photo-1631049552057-403cdb8f0658?auto=format&fit=crop&w=1200&q=85', 'Giường đôi cùng sofa thư giãn trong phòng', 3),
  (9, 2, 'https://images.unsplash.com/photo-1595526114035-0d45ed16cfbf?auto=format&fit=crop&w=1200&q=85', 'Góc đọc sách và giường đôi ga trắng tinh tươm', 4),
  (10, 2, 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=1200&q=85', 'Phòng tắm vách kính và gương viền gỗ hiện đại', 5),

  -- Deluxe Suite: Phong cách boutique cổ điển thanh lịch với khu tiếp khách riêng
  (11, 3, 'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=1200&q=85', 'Không gian Suite kết hợp phòng ngủ và sofa tiếp khách', 1),
  (12, 3, 'https://images.unsplash.com/photo-1591088398332-8a7791972843?auto=format&fit=crop&w=1200&q=85', 'Bàn làm việc, ghế bành nhung và cửa sổ cao', 2),
  (13, 3, 'https://images.unsplash.com/photo-1560185893-a55cbc8c57e8?auto=format&fit=crop&w=1200&q=85', 'Khu vực giường ngủ lớn với thảm họa tiết cổ điển', 3),
  (14, 3, 'https://images.unsplash.com/photo-1560185007-cde436f6a4d0?auto=format&fit=crop&w=1200&q=85', 'Góc bàn ăn và tiếp khách bên ô cửa sổ vòm', 4),
  (15, 3, 'https://images.unsplash.com/photo-1540518614846-7eded433c457?auto=format&fit=crop&w=1200&q=85', 'Chi tiết đầu giường bọc nệm và tủ gỗ trầm', 5),

  -- Presidential VIP: Căn suite tổng thống rộng lớn, sáng sang trọng
  (16, 4, 'https://images.unsplash.com/photo-1512918728675-ed5a9ecdebfd?auto=format&fit=crop&w=1200&q=85', 'Phòng ngủ Master sang trọng nối liền phòng tắm', 1),
  (17, 4, 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1200&q=85', 'Giường King bọc nệm cùng ghế băng cuối giường', 2),
  (18, 4, 'https://images.unsplash.com/photo-1598928506311-c55ded91a20c?auto=format&fit=crop&w=1200&q=85', 'Phòng khách riêng trang nhã với hệ tủ sách', 3),
  (19, 4, 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=1200&q=85', 'Phòng sinh hoạt chung và bàn ăn tầm nhìn thành phố', 4),
  (20, 4, 'https://images.unsplash.com/photo-1620626011761-996317b8d101?auto=format&fit=crop&w=1200&q=85', 'Phòng tắm đá cẩm thạch với bồn tắm độc lập', 5);

-- ----------------------------------------------------------------------------
-- 3. Service Items (8 dịch vụ)
-- ----------------------------------------------------------------------------
INSERT INTO service_items (id, name, unit_price, unit, active) VALUES
  (1, 'Bữa sáng tại phòng', 180000, 'suất', TRUE),
  (2, 'Giặt ủi', 70000, 'kg', TRUE),
  (3, 'Nước giải khát minibar', 45000, 'lon', TRUE),
  (4, 'Đưa đón sân bay', 450000, 'chuyến', TRUE),
  (5, 'Massage tại phòng', 850000, 'giờ', TRUE),
  (6, 'Gọi nhân viên hỗ trợ', 0, 'lần', TRUE),
  (7, 'Bữa trưa tại phòng', 220000, 'suất', TRUE),
  (8, 'Bữa tối tại phòng', 280000, 'suất', TRUE);

-- ----------------------------------------------------------------------------
-- 4. Rooms (12 phòng vật lý)
-- ----------------------------------------------------------------------------
INSERT INTO rooms (id, room_number, floor, room_type_id, status, operational) VALUES
  (1, '101', 1, 1, 'AVAILABLE', TRUE),
  (2, '102', 1, 1, 'AVAILABLE', TRUE),
  (3, '201', 2, 2, 'OCCUPIED', TRUE),
  (4, '202', 2, 2, 'AVAILABLE', TRUE),
  (5, '301', 3, 3, 'AVAILABLE', TRUE),
  (6, '401', 4, 4, 'AVAILABLE', TRUE),
  (7, '103', 1, 2, 'AVAILABLE', TRUE),
  (8, '203', 2, 2, 'AVAILABLE', TRUE),
  (9, '302', 3, 3, 'AVAILABLE', TRUE),
  (10, '402', 4, 4, 'AVAILABLE', TRUE),
  (11, '501', 5, 3, 'AVAILABLE', TRUE),
  (12, '601', 6, 4, 'AVAILABLE', TRUE);

-- ----------------------------------------------------------------------------
-- 5. Room Images (Mỗi phòng 5 hình ảnh đồng bộ phong cách — 12 phòng x 5 = 60 ảnh)
-- ----------------------------------------------------------------------------
INSERT INTO room_images (id, room_id, image_url, caption, display_order) VALUES
  -- Phòng 101 (Standard Single)
  (1, 1, 'https://images.unsplash.com/photo-1611892440504-42a792e24d32?auto=format&fit=crop&w=1200&q=85', 'Phòng 101 - Không gian tổng thể phòng ngủ gỗ ấm áp', 1),
  (2, 1, 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=1200&q=85', 'Phòng 101 - Giường ngủ và băng ghế gỗ cuối giường', 2),
  (3, 1, 'https://images.unsplash.com/photo-1566665797739-1674de7a421a?auto=format&fit=crop&w=1200&q=85', 'Phòng 101 - Đầu giường ốp gỗ cùng đèn ngủ dịu nhẹ', 3),
  (4, 1, 'https://images.unsplash.com/photo-1618773928121-c32242e63f39?auto=format&fit=crop&w=1200&q=85', 'Phòng 101 - Góc nghỉ ngơi và rèm chắn sáng', 4),
  (5, 1, 'https://images.unsplash.com/photo-1507652313519-d4e9174996dd?auto=format&fit=crop&w=1200&q=85', 'Phòng 101 - Phòng tắm đá tự nhiên ấm cúng', 5),

  -- Phòng 102 (Standard Single)
  (6, 2, 'https://images.unsplash.com/photo-1611892440504-42a792e24d32?auto=format&fit=crop&w=1200&q=85', 'Phòng 102 - Không gian tổng thể phòng ngủ gỗ ấm áp', 1),
  (7, 2, 'https://images.unsplash.com/photo-1582719478250-c89cae4dc85b?auto=format&fit=crop&w=1200&q=85', 'Phòng 102 - Giường ngủ và băng ghế gỗ cuối giường', 2),
  (8, 2, 'https://images.unsplash.com/photo-1566665797739-1674de7a421a?auto=format&fit=crop&w=1200&q=85', 'Phòng 102 - Đầu giường ốp gỗ cùng đèn ngủ dịu nhẹ', 3),
  (9, 2, 'https://images.unsplash.com/photo-1618773928121-c32242e63f39?auto=format&fit=crop&w=1200&q=85', 'Phòng 102 - Góc nghỉ ngơi và rèm chắn sáng', 4),
  (10, 2, 'https://images.unsplash.com/photo-1507652313519-d4e9174996dd?auto=format&fit=crop&w=1200&q=85', 'Phòng 102 - Phòng tắm đá tự nhiên ấm cúng', 5),

  -- Phòng 201 (Standard Double)
  (11, 3, 'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=1200&q=85', 'Phòng 201 - Góc sinh hoạt và tiếp khách sáng thoáng', 1),
  (12, 3, 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?auto=format&fit=crop&w=1200&q=85', 'Phòng 201 - Phòng giường đôi cạnh cửa sổ đón nắng', 2),
  (13, 3, 'https://images.unsplash.com/photo-1631049552057-403cdb8f0658?auto=format&fit=crop&w=1200&q=85', 'Phòng 201 - Giường đôi cùng sofa thư giãn', 3),
  (14, 3, 'https://images.unsplash.com/photo-1595526114035-0d45ed16cfbf?auto=format&fit=crop&w=1200&q=85', 'Phòng 201 - Góc đọc sách và giường ga trắng tinh tươm', 4),
  (15, 3, 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=1200&q=85', 'Phòng 201 - Phòng tắm vách kính và gương viền gỗ', 5),

  -- Phòng 202 (Standard Double)
  (16, 4, 'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=1200&q=85', 'Phòng 202 - Góc sinh hoạt và tiếp khách sáng thoáng', 1),
  (17, 4, 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?auto=format&fit=crop&w=1200&q=85', 'Phòng 202 - Phòng giường đôi cạnh cửa sổ đón nắng', 2),
  (18, 4, 'https://images.unsplash.com/photo-1631049552057-403cdb8f0658?auto=format&fit=crop&w=1200&q=85', 'Phòng 202 - Giường đôi cùng sofa thư giãn', 3),
  (19, 4, 'https://images.unsplash.com/photo-1595526114035-0d45ed16cfbf?auto=format&fit=crop&w=1200&q=85', 'Phòng 202 - Góc đọc sách và giường ga trắng tinh tươm', 4),
  (20, 4, 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=1200&q=85', 'Phòng 202 - Phòng tắm vách kính và gương viền gỗ', 5),

  -- Phòng 301 (Deluxe Suite)
  (21, 5, 'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=1200&q=85', 'Phòng 301 - Không gian Suite kết hợp giường ngủ và sofa', 1),
  (22, 5, 'https://images.unsplash.com/photo-1591088398332-8a7791972843?auto=format&fit=crop&w=1200&q=85', 'Phòng 301 - Bàn làm việc, ghế bành và cửa sổ cao', 2),
  (23, 5, 'https://images.unsplash.com/photo-1560185893-a55cbc8c57e8?auto=format&fit=crop&w=1200&q=85', 'Phòng 301 - Khu vực giường ngủ lớn cổ điển', 3),
  (24, 5, 'https://images.unsplash.com/photo-1560185007-cde436f6a4d0?auto=format&fit=crop&w=1200&q=85', 'Phòng 301 - Góc bàn ăn và tiếp khách bên cửa sổ', 4),
  (25, 5, 'https://images.unsplash.com/photo-1540518614846-7eded433c457?auto=format&fit=crop&w=1200&q=85', 'Phòng 301 - Giường ngủ êm ái với nội thất gỗ trầm', 5),

  -- Phòng 401 (Presidential VIP)
  (26, 6, 'https://images.unsplash.com/photo-1512918728675-ed5a9ecdebfd?auto=format&fit=crop&w=1200&q=85', 'Phòng 401 - Phòng ngủ Master nối liền phòng tắm', 1),
  (27, 6, 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1200&q=85', 'Phòng 401 - Giường King bọc nệm cùng ghế băng cuối giường', 2),
  (28, 6, 'https://images.unsplash.com/photo-1598928506311-c55ded91a20c?auto=format&fit=crop&w=1200&q=85', 'Phòng 401 - Phòng khách riêng với hệ tủ sách sang trọng', 3),
  (29, 6, 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=1200&q=85', 'Phòng 401 - Phòng sinh hoạt chung và bàn ăn toàn cảnh', 4),
  (30, 6, 'https://images.unsplash.com/photo-1620626011761-996317b8d101?auto=format&fit=crop&w=1200&q=85', 'Phòng 401 - Phòng tắm đá cẩm thạch với bồn tắm đứng', 5),

  -- Phòng 103 (Standard Double)
  (31, 7, 'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=1200&q=85', 'Phòng 103 - Góc sinh hoạt và tiếp khách sáng thoáng', 1),
  (32, 7, 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?auto=format&fit=crop&w=1200&q=85', 'Phòng 103 - Phòng giường đôi cạnh cửa sổ đón nắng', 2),
  (33, 7, 'https://images.unsplash.com/photo-1631049552057-403cdb8f0658?auto=format&fit=crop&w=1200&q=85', 'Phòng 103 - Giường đôi cùng sofa thư giãn', 3),
  (34, 7, 'https://images.unsplash.com/photo-1595526114035-0d45ed16cfbf?auto=format&fit=crop&w=1200&q=85', 'Phòng 103 - Góc đọc sách và giường ga trắng tinh tươm', 4),
  (35, 7, 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=1200&q=85', 'Phòng 103 - Phòng tắm vách kính và gương viền gỗ', 5),

  -- Phòng 203 (Standard Double)
  (36, 8, 'https://images.unsplash.com/photo-1618221195710-dd6b41faaea6?auto=format&fit=crop&w=1200&q=85', 'Phòng 203 - Góc sinh hoạt và tiếp khách sáng thoáng', 1),
  (37, 8, 'https://images.unsplash.com/photo-1631049307264-da0ec9d70304?auto=format&fit=crop&w=1200&q=85', 'Phòng 203 - Phòng giường đôi cạnh cửa sổ đón nắng', 2),
  (38, 8, 'https://images.unsplash.com/photo-1631049552057-403cdb8f0658?auto=format&fit=crop&w=1200&q=85', 'Phòng 203 - Giường đôi cùng sofa thư giãn', 3),
  (39, 8, 'https://images.unsplash.com/photo-1595526114035-0d45ed16cfbf?auto=format&fit=crop&w=1200&q=85', 'Phòng 203 - Góc đọc sách và giường ga trắng tinh tươm', 4),
  (40, 8, 'https://images.unsplash.com/photo-1584622650111-993a426fbf0a?auto=format&fit=crop&w=1200&q=85', 'Phòng 203 - Phòng tắm vách kính và gương viền gỗ', 5),

  -- Phòng 302 (Deluxe Suite)
  (41, 9, 'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=1200&q=85', 'Phòng 302 - Không gian Suite kết hợp giường ngủ và sofa', 1),
  (42, 9, 'https://images.unsplash.com/photo-1591088398332-8a7791972843?auto=format&fit=crop&w=1200&q=85', 'Phòng 302 - Bàn làm việc, ghế bành và cửa sổ cao', 2),
  (43, 9, 'https://images.unsplash.com/photo-1560185893-a55cbc8c57e8?auto=format&fit=crop&w=1200&q=85', 'Phòng 302 - Khu vực giường ngủ lớn cổ điển', 3),
  (44, 9, 'https://images.unsplash.com/photo-1560185007-cde436f6a4d0?auto=format&fit=crop&w=1200&q=85', 'Phòng 302 - Góc bàn ăn và tiếp khách bên cửa sổ', 4),
  (45, 9, 'https://images.unsplash.com/photo-1540518614846-7eded433c457?auto=format&fit=crop&w=1200&q=85', 'Phòng 302 - Giường ngủ êm ái với nội thất gỗ trầm', 5),

  -- Phòng 402 (Presidential VIP)
  (46, 10, 'https://images.unsplash.com/photo-1512918728675-ed5a9ecdebfd?auto=format&fit=crop&w=1200&q=85', 'Phòng 402 - Phòng ngủ Master nối liền phòng tắm', 1),
  (47, 10, 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1200&q=85', 'Phòng 402 - Giường King bọc nệm cùng ghế băng cuối giường', 2),
  (48, 10, 'https://images.unsplash.com/photo-1598928506311-c55ded91a20c?auto=format&fit=crop&w=1200&q=85', 'Phòng 402 - Phòng khách riêng với hệ tủ sách sang trọng', 3),
  (49, 10, 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=1200&q=85', 'Phòng 402 - Phòng sinh hoạt chung và bàn ăn toàn cảnh', 4),
  (50, 10, 'https://images.unsplash.com/photo-1620626011761-996317b8d101?auto=format&fit=crop&w=1200&q=85', 'Phòng 402 - Phòng tắm đá cẩm thạch với bồn tắm đứng', 5),

  -- Phòng 501 (Deluxe Suite)
  (51, 11, 'https://images.unsplash.com/photo-1590490360182-c33d57733427?auto=format&fit=crop&w=1200&q=85', 'Phòng 501 - Không gian Suite kết hợp giường ngủ và sofa', 1),
  (52, 11, 'https://images.unsplash.com/photo-1591088398332-8a7791972843?auto=format&fit=crop&w=1200&q=85', 'Phòng 501 - Bàn làm việc, ghế bành và cửa sổ cao', 2),
  (53, 11, 'https://images.unsplash.com/photo-1560185893-a55cbc8c57e8?auto=format&fit=crop&w=1200&q=85', 'Phòng 501 - Khu vực giường ngủ lớn cổ điển', 3),
  (54, 11, 'https://images.unsplash.com/photo-1560185007-cde436f6a4d0?auto=format&fit=crop&w=1200&q=85', 'Phòng 501 - Góc bàn ăn và tiếp khách bên cửa sổ', 4),
  (55, 11, 'https://images.unsplash.com/photo-1540518614846-7eded433c457?auto=format&fit=crop&w=1200&q=85', 'Phòng 501 - Giường ngủ êm ái với nội thất gỗ trầm', 5),

  -- Phòng 601 (Presidential VIP)
  (56, 12, 'https://images.unsplash.com/photo-1512918728675-ed5a9ecdebfd?auto=format&fit=crop&w=1200&q=85', 'Phòng 601 - Phòng ngủ Master nối liền phòng tắm', 1),
  (57, 12, 'https://images.unsplash.com/photo-1505693416388-ac5ce068fe85?auto=format&fit=crop&w=1200&q=85', 'Phòng 601 - Giường King bọc nệm cùng ghế băng cuối giường', 2),
  (58, 12, 'https://images.unsplash.com/photo-1598928506311-c55ded91a20c?auto=format&fit=crop&w=1200&q=85', 'Phòng 601 - Phòng khách riêng với hệ tủ sách sang trọng', 3),
  (59, 12, 'https://images.unsplash.com/photo-1560448204-e02f11c3d0e2?auto=format&fit=crop&w=1200&q=85', 'Phòng 601 - Phòng sinh hoạt chung và bàn ăn toàn cảnh', 4),
  (60, 12, 'https://images.unsplash.com/photo-1620626011761-996317b8d101?auto=format&fit=crop&w=1200&q=85', 'Phòng 601 - Phòng tắm đá cẩm thạch với bồn tắm đứng', 5);

-- ----------------------------------------------------------------------------
-- 6. Room Services (Liên kết dịch vụ theo phòng)
-- ----------------------------------------------------------------------------
INSERT INTO room_services (room_id, service_item_id) VALUES
  (1, 1), (1, 2), (1, 3), (1, 6), (1, 7), (1, 8),
  (2, 1), (2, 2), (2, 3), (2, 6), (2, 7), (2, 8),
  (3, 1), (3, 2), (3, 3), (3, 6), (3, 7), (3, 8),
  (4, 1), (4, 2), (4, 3), (4, 6), (4, 7), (4, 8),
  (5, 1), (5, 2), (5, 3), (5, 4), (5, 5), (5, 6), (5, 7), (5, 8),
  (6, 1), (6, 2), (6, 3), (6, 4), (6, 5), (6, 6), (6, 7), (6, 8),
  (7, 1), (7, 2), (7, 3), (7, 6), (7, 7), (7, 8),
  (8, 1), (8, 2), (8, 3), (8, 6), (8, 7), (8, 8),
  (9, 1), (9, 2), (9, 3), (9, 4), (9, 5), (9, 6), (9, 7), (9, 8),
  (10, 1), (10, 2), (10, 3), (10, 4), (10, 5), (10, 6), (10, 7), (10, 8),
  (11, 1), (11, 2), (11, 3), (11, 4), (11, 5), (11, 6), (11, 7), (11, 8),
  (12, 1), (12, 2), (12, 3), (12, 4), (12, 5), (12, 6), (12, 7), (12, 8);

-- ----------------------------------------------------------------------------
-- 7. Pricing Configurations (Chiến lược giá theo mùa/ngày)
-- ----------------------------------------------------------------------------
INSERT INTO pricing_configurations (id, strategy, multiplier, default_multiplier) VALUES
  (1, 'STANDARD', 1.0000, 1.0000),
  (2, 'WEEKEND',  1.2000, 1.2000),
  (3, 'HOLIDAY',  1.5000, 1.5000);

-- ----------------------------------------------------------------------------
-- 8. Users, Customers, Employees, Receptionists, Admins (Mật khẩu mẫu: 123456)
-- ----------------------------------------------------------------------------
INSERT INTO users (id, username, password_hash, full_name, email, phone, role, account_status, created_at) VALUES
  (1, 'customer1', '$2b$10$8Qo/lnqjTYnRLxXFcrhGK.HUM8pm1fx21GFffmSiud.eEn1uHch66', 'Demo Customer One', 'demo.customer1@hotel.local', '0900000002', 'ROLE_CUSTOMER', 'ACTIVE', NOW(6)),
  (2, 'customer2', '$2b$10$8Qo/lnqjTYnRLxXFcrhGK.HUM8pm1fx21GFffmSiud.eEn1uHch66', 'Demo Customer Two', 'demo.customer2@hotel.local', '0900000003', 'ROLE_CUSTOMER', 'ACTIVE', NOW(6)),
  (3, 'reception', '$2b$10$8Qo/lnqjTYnRLxXFcrhGK.HUM8pm1fx21GFffmSiud.eEn1uHch66', 'Demo Receptionist', 'demo.reception@hotel.local', '0900000001', 'ROLE_RECEPTIONIST', 'ACTIVE', NOW(6)),
  (4, 'admin', '$2b$10$8Qo/lnqjTYnRLxXFcrhGK.HUM8pm1fx21GFffmSiud.eEn1uHch66', 'Quản trị viên', 'demo.admin@hotel.local', '0900000000', 'ROLE_ADMIN', 'ACTIVE', NOW(6));

INSERT INTO customers (id, identity_card, address, loyalty_points) VALUES
  (1, 'DEMO-ID-0001', '1 Example Street, Ho Chi Minh City', 120),
  (2, 'DEMO-ID-0002', '2 Example Street, Ho Chi Minh City', 40);

INSERT INTO employees (id, employee_code, salary, hire_date) VALUES
  (3, 'DEMO-FD-01', 12000000.00, CURDATE()),
  (4, 'ADMIN-01', 25000000.00, CURDATE());

INSERT INTO receptionists (id, desk_number) VALUES
  (3, 1);

INSERT INTO admins (id, admin_level) VALUES
  (4, 'SUPER_ADMIN');

-- ----------------------------------------------------------------------------
-- 9. Bookings & Booking Details (7 đơn đặt phòng mẫu)
-- ----------------------------------------------------------------------------
INSERT INTO bookings (
  id, booking_code, customer_id, check_in_date, check_out_date, status,
  confirmed_at, checked_in_at, checked_out_at,
  cancelled_at, cancelled_by, cancellation_reason, rejection_reason, created_at
) VALUES
  (1, 'DEMO-BK-PENDING', 1, DATE_ADD(CURDATE(), INTERVAL 2 DAY), DATE_ADD(CURDATE(), INTERVAL 4 DAY), 'PENDING', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NOW(6)),
  (2, 'DEMO-BK-CONFIRMED', 1, DATE_ADD(CURDATE(), INTERVAL 7 DAY), DATE_ADD(CURDATE(), INTERVAL 9 DAY), 'CONFIRMED', NOW(6), NULL, NULL, NULL, NULL, NULL, NULL, NOW(6)),
  (3, 'DEMO-BK-CHECKED-IN', 2, CURDATE(), DATE_ADD(CURDATE(), INTERVAL 2 DAY), 'CHECKED_IN', NOW(6), NOW(6), NULL, NULL, NULL, NULL, NULL, NOW(6)),
  (4, 'DEMO-BK-COMPLETED', 1, DATE_SUB(CURDATE(), INTERVAL 10 DAY), DATE_SUB(CURDATE(), INTERVAL 8 DAY), 'COMPLETED', DATE_SUB(NOW(6), INTERVAL 10 DAY), DATE_SUB(NOW(6), INTERVAL 10 DAY), DATE_SUB(NOW(6), INTERVAL 8 DAY), NULL, NULL, NULL, NULL, DATE_SUB(NOW(6), INTERVAL 10 DAY)),
  (5, 'DEMO-BK-CANCELLED', 2, DATE_ADD(CURDATE(), INTERVAL 3 DAY), DATE_ADD(CURDATE(), INTERVAL 5 DAY), 'CANCELLED', NULL, NULL, NULL, NOW(6), 'demo.customer2', 'Seed example cancellation', NULL, NOW(6)),
  (6, 'DEMO-BK-REJECTED', 1, DATE_ADD(CURDATE(), INTERVAL 4 DAY), DATE_ADD(CURDATE(), INTERVAL 5 DAY), 'REJECTED', NULL, NULL, NULL, NULL, NULL, NULL, 'Seed example rejection', NOW(6)),
  (7, 'DEMO-BK-MULTI-ROOM', 2, DATE_ADD(CURDATE(), INTERVAL 2 DAY), DATE_ADD(CURDATE(), INTERVAL 4 DAY), 'PENDING', NULL, NULL, NULL, NULL, NULL, NULL, NULL, NOW(6));

INSERT INTO booking_details (id, booking_id, room_id, price_per_night, guest_count) VALUES
  (1, 1, 1, 650000.00, 1),
  (2, 2, 2, 650000.00, 1),
  (3, 3, 3, 890000.00, 2),
  (4, 4, 4, 890000.00, 2),
  (5, 5, 5, 1650000.00, 2),
  (6, 6, 6, 3900000.00, 4),
  (7, 7, 7, 890000.00, 2),
  (8, 7, 8, 890000.00, 1);

-- ----------------------------------------------------------------------------
-- 10. Invoices, Invoice Items & Payments (Cho đơn đã hoàn tất DEMO-BK-COMPLETED)
-- ----------------------------------------------------------------------------
INSERT INTO invoices (
  id, booking_id, room_amount, service_amount, tax, surcharge, discount,
  total_amount, successful_payments, balance_due, status, payment_method, is_paid, paid_at
) VALUES
  (1, 4, 1780000.00, 0.00, 178000.00, 0.00, 0.00, 1958000.00, 1958000.00, 0.00, 'PAID', 'CASH', TRUE, DATE_SUB(NOW(6), INTERVAL 8 DAY));

INSERT INTO invoice_items (id, invoice_id, type, description, quantity, unit_price, line_total) VALUES
  (1, 1, 'ROOM', 'Phòng 202 (2 đêm)', 2, 890000.00, 1780000.00),
  (2, 1, 'SURCHARGE', 'Thuế VAT (10%)', 1, 178000.00, 178000.00);

INSERT INTO payments (
  id, booking_id, invoice_id, type, amount, method, status,
  idempotency_key, reference, confirmed_transaction_reference, confirmed_by, reported_at, paid_at, created_at
) VALUES
  (1, NULL, 1, 'BALANCE', 1958000.00, 'CASH', 'SUCCESSFUL', 'seed-completed-payment', 'Thu tiền mặt tại quầy', NULL, 'demo.reception', NULL, DATE_SUB(NOW(6), INTERVAL 8 DAY), DATE_SUB(NOW(6), INTERVAL 8 DAY));
