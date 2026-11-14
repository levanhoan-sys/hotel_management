package com.hotel.service.impl;

import com.hotel.config.HotelBookingProperties;
import com.hotel.entity.Booking;
import com.hotel.entity.Refund;
import com.hotel.enums.BookingStatus;
import com.hotel.exception.BadRequestException;
import com.hotel.exception.ResourceNotFoundException;
import com.hotel.repository.BookingRepository;
import com.hotel.repository.RefundRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.math.BigDecimal;
import java.time.Duration;
import java.time.Instant;

@Service
@RequiredArgsConstructor
public class CancellationPolicyService {
    private final BookingRepository bookings;
    private final RefundRepository refunds;
    private final HotelBookingProperties properties;

    @Transactional(readOnly = true)
    public Preview preview(Long id, String username) {
        Booking booking = owned(bookings.findById(id).orElseThrow(() -> new ResourceNotFoundException("Booking not found")), username);
        return calculate(booking, Instant.now());
    }

    @Transactional
    public Preview cancel(Long id, String username, String reason) {
        Booking booking = owned(bookings.findByIdForUpdate(id).orElseThrow(() -> new ResourceNotFoundException("Booking not found")), username);
        if (booking.getStatus() != BookingStatus.PENDING_DEPOSIT && booking.getStatus() != BookingStatus.PENDING_VERIFICATION && booking.getStatus() != BookingStatus.CONFIRMED)
            throw new BadRequestException("Booking cannot be cancelled in its current state");
        Preview preview = calculate(booking, Instant.now());
        booking.cancel(username, reason);
        if (preview.refundAmount().signum() > 0 && refunds.findByBookingId(id).isEmpty())
            refunds.save(new Refund(booking, preview.refundAmount()));
        return preview;
    }

    private Preview calculate(Booking booking, Instant now) {
        BigDecimal paid = booking.getDepositPaidAt() == null || booking.getDepositAmount() == null ? BigDecimal.ZERO : booking.getDepositAmount();
        int free = booking.getCancellationFreeHoursSnapshot() == null ? properties.cancellationFreeHours() : booking.getCancellationFreeHoursSnapshot();
        int partial = booking.getCancellationPartialHoursSnapshot() == null ? properties.cancellationPartialHours() : booking.getCancellationPartialHoursSnapshot();
        Instant checkIn = booking.getCheckInDate().atTime(properties.checkInTime()).atZone(properties.timezone()).toInstant();
        long seconds = Duration.between(now, checkIn).getSeconds();
        BigDecimal rate = seconds >= free * 3600L ? BigDecimal.ONE : seconds >= partial * 3600L ? new BigDecimal("0.5") : BigDecimal.ZERO;
        BigDecimal refund = paid.multiply(rate).setScale(0, java.math.RoundingMode.HALF_UP);
        return new Preview(paid, rate, refund, paid.subtract(refund));
    }

    private Booking owned(Booking booking, String username) {
        if (!booking.getCustomer().getUsername().equals(username))
            throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.FORBIDDEN);
        return booking;
    }

    public record Preview(BigDecimal depositPaid, BigDecimal refundRate, BigDecimal refundAmount, BigDecimal nonRefundableAmount) { }
}
