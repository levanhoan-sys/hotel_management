package com.hotel.service.impl;

import com.hotel.enums.BookingStatus;
import com.hotel.repository.BookingRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.Instant;

@Service
@RequiredArgsConstructor
public class DepositExpirationService {
    private final BookingRepository bookings;

    @Transactional
    public void expireOne(Long bookingId) {
        var booking = bookings.findByIdForUpdate(bookingId).orElse(null);
        if (booking == null || (booking.getStatus() != BookingStatus.PENDING_DEPOSIT && booking.getStatus() != BookingStatus.PENDING_VERIFICATION)) return;
        Instant now = Instant.now();
        if ((booking.getStatus() == BookingStatus.PENDING_DEPOSIT && booking.getDepositDeadline() != null && !now.isBefore(booking.getDepositDeadline()))
                || (booking.getStatus() == BookingStatus.PENDING_VERIFICATION && booking.getVerificationDeadline() != null && !now.isBefore(booking.getVerificationDeadline()))) {
            booking.expire(now);
        }
    }
}
