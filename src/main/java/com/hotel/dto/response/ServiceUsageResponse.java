package com.hotel.dto.response;

import com.hotel.entity.ServiceOrder;
import com.hotel.enums.ServiceOrderStatus;

import java.time.LocalDateTime;

public record ServiceUsageResponse(Long id, Long bookingId, String bookingCode, String customerName,
                                   Long bookingRoomId, String roomNumber,
                                   Long serviceId, String serviceName, int quantity, String unit,
                                   double unitPrice, double subTotal, LocalDateTime orderedAt,
                                   ServiceOrderStatus approvalStatus, boolean cancelled,
                                   LocalDateTime cancelledAt, String cancellationReason) {
    public static ServiceUsageResponse from(ServiceOrder usage) {
        return new ServiceUsageResponse(usage.getId(), usage.getBooking().getId(), usage.getBooking().getBookingCode(),
                usage.getBooking().getCustomer().getFullName(),
                usage.getBookingDetail() == null ? null : usage.getBookingDetail().getId(),
                usage.getBookingDetail() == null ? null : usage.getBookingDetail().getRoom().getRoomNumber(),
                usage.getServiceItem().getId(), usage.getServiceItem().getName(), usage.getQuantity(),
                usage.getServiceItem().getUnit(), usage.getUnitPrice(), usage.getSubTotal(),
                usage.getOrderedAt(), usage.getApprovalStatus(), usage.isCancelled(), usage.getCancelledAt(), usage.getCancellationReason());
    }
}
