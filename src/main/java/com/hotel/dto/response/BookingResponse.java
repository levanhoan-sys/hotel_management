package com.hotel.dto.response;

import com.hotel.entity.Booking;
import com.hotel.enums.BookingStatus;
import com.hotel.enums.ServiceOrderStatus;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDate;
import java.time.Instant;
import java.math.BigDecimal;
import java.util.List;

@Data
@Builder
public class BookingResponse {
    private Long id;
    private String bookingCode;
    private Long customerId;
    private String customerName;
    private LocalDate checkInDate;
    private LocalDate checkOutDate;
    private int numberOfNights;
    private BookingStatus status;
    private BigDecimal depositAmount;
    private BigDecimal depositRate;
    private Instant depositDeadline;
    private Instant verificationDeadline;
    private Instant depositReportedAt;
    private String transferContent;
    private Instant depositPaidAt;
    private Instant expiredAt;
    private java.time.LocalDateTime confirmedAt;
    private java.time.LocalDateTime checkedInAt;
    private java.time.LocalDateTime checkedOutAt;
    private List<String> roomNumbers;
    private List<BookingRoomResponse> rooms;
    private List<String> roomImageUrls;
    private List<ServiceOrderResponse> serviceOrders;
    private double totalRoomCharge;
    private double totalServiceCharge;
    private double estimatedTotal;
    private java.time.LocalDateTime cancelledAt;
    private String cancelledBy;
    private String cancellationReason;
    private String rejectionReason;

    public static BookingResponse fromEntity(Booking booking) {
        List<String> rooms = booking.getDetails().stream()
                .map(d -> d.getRoom().getRoomNumber())
                .toList();
        List<String> images = booking.getDetails().stream().map(d -> d.getRoom().getRoomType().getImageUrl()).toList();
        List<BookingRoomResponse> roomDetails = booking.getDetails().stream()
                .map(d -> new BookingRoomResponse(d.getRoom().getId(), d.getRoom().getRoomNumber(), d.getGuestCount(), d.getRoom().getRoomType().getCapacity(), d.getPricePerNight(), d.getId()))
                .toList();
        List<ServiceOrderResponse> orders = booking.getServiceOrders().stream().map(o -> new ServiceOrderResponse(
                o.getServiceItem().getName(), o.getQuantity(), o.getServiceItem().getUnit(), o.getSubTotal(),
                o.getId(), o.getBookingDetail() == null ? null : o.getBookingDetail().getId(),
                o.getBookingDetail() == null ? null : o.getBookingDetail().getRoom().getRoomNumber(),
                o.getUnitPrice(), o.getApprovalStatus(), o.isCancelled(), o.getOrderedAt(), o.getCancelledAt(), o.getCancellationReason())).toList();

        double roomCharge = booking.calculateTotalRoomCharge();
        double serviceCharge = booking.calculateTotalServiceCharge();

        return BookingResponse.builder()
                .id(booking.getId())
                .bookingCode(booking.getBookingCode())
                .customerId(booking.getCustomer().getId())
                .customerName(booking.getCustomer().getFullName())
                .checkInDate(booking.getCheckInDate())
                .checkOutDate(booking.getCheckOutDate())
                .numberOfNights(booking.getNumberOfNights())
                .status(booking.getStatus())
                .depositAmount(booking.getDepositAmount())
                .depositRate(booking.getDepositRate())
                .depositDeadline(booking.getDepositDeadline())
                .verificationDeadline(booking.getVerificationDeadline())
                .depositReportedAt(booking.getDepositReportedAt())
                .transferContent(booking.getTransferContent())
                .depositPaidAt(booking.getDepositPaidAt())
                .expiredAt(booking.getExpiredAt())
                .confirmedAt(booking.getConfirmedAt())
                .checkedInAt(booking.getCheckedInAt())
                .checkedOutAt(booking.getCheckedOutAt())
                .roomNumbers(rooms)
                .rooms(roomDetails)
                .roomImageUrls(images)
                .serviceOrders(orders)
                .totalRoomCharge(roomCharge)
                .totalServiceCharge(serviceCharge)
                .estimatedTotal(roomCharge + serviceCharge)
                .cancelledAt(booking.getCancelledAt())
                .cancelledBy(booking.getCancelledBy())
                .cancellationReason(booking.getCancellationReason())
                .rejectionReason(booking.getRejectionReason())
                .build();
    }

    public record BookingRoomResponse(Long roomId, String roomNumber, int guestCount, int capacity, BigDecimal pricePerNight, Long bookingRoomId) { }

    public record ServiceOrderResponse(String name, int quantity, String unit, double subTotal,
                                        Long id, Long bookingRoomId, String roomNumber, double unitPrice,
                                        ServiceOrderStatus approvalStatus, boolean cancelled, java.time.LocalDateTime orderedAt,
                                        java.time.LocalDateTime cancelledAt, String cancellationReason) { }
}
