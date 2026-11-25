# Chính sách hủy và hoàn cọc

Giờ nhận phòng mặc định là 14:00 theo múi giờ `Asia/Ho_Chi_Minh`. Backend tính lại số tiền hoàn tại lúc chấp nhận yêu cầu hủy; phần xem trước chỉ mang tính tham khảo.

| Thời gian trước check-in | Hoàn tiền cọc |
| --- | ---: |
| Từ 72 giờ trở lên | 100% |
| Từ 24 giờ đến dưới 72 giờ | 50% |
| Dưới 24 giờ | 0% |

Đơn đang chờ đặt cọc và chưa thanh toán không tạo yêu cầu hoàn tiền. Đơn đã thanh toán cọc được tạo một bản ghi `refunds` ở trạng thái `PENDING` nếu có số tiền phải hoàn. Khách xem bản ghi qua `GET /api/bookings/{id}/refunds`; lễ tân xem qua `GET /api/reception/refunds` và ghi nhận giao dịch hoàn đã thực hiện bằng `POST /api/reception/refunds/{id}/process` với `reference`.

Mã tham chiếu khi xử lý là bằng chứng của việc hoàn tiền ngoài hệ thống. Hệ thống chưa tích hợp cổng hoàn tiền tự động. Không được bấm xử lý trước khi đã thực hiện chuyển tiền thực tế.
