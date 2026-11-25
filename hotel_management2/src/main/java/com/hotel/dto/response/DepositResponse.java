package com.hotel.dto.response;

import com.hotel.entity.Booking;
import com.hotel.entity.Payment;
import com.hotel.enums.PaymentStatus;

import java.math.BigDecimal;
import java.time.Instant;

public record DepositResponse(Long bookingId, String bookingCode, BigDecimal amount,
                              Instant deadline, Long paymentId, PaymentStatus paymentStatus,
                              Instant reportedAt, Instant verificationDeadline) {
    public static DepositResponse from(Booking booking, Payment payment) {
        return new DepositResponse(booking.getId(), booking.getBookingCode(), booking.getDepositAmount(),
                booking.getDepositDeadline(), payment == null ? null : payment.getId(),
                payment == null ? null : payment.getStatus(),
                booking.getDepositReportedAt(), booking.getVerificationDeadline());
    }
}
