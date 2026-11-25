package com.hotel.config;

import com.hotel.enums.BookingStatus;
import com.hotel.repository.BookingRepository;
import com.hotel.service.impl.DepositExpirationService;
import lombok.RequiredArgsConstructor;
import org.springframework.scheduling.annotation.Scheduled;
import org.springframework.stereotype.Component;

import java.time.Instant;

@Component
@RequiredArgsConstructor
public class DepositExpirationJob {
    private final BookingRepository bookings;
    private final DepositExpirationService expiration;

    @Scheduled(fixedDelayString = "${hotel.booking.expiration-scan-ms:60000}")
    public void expireUnpaidBookings() {
        for (Long id : bookings.findExpiredDepositBookingIds(Instant.now())) {
            expiration.expireOne(id);
        }
        for (var booking : bookings.findByStatus(BookingStatus.PENDING_VERIFICATION)) {
            if (booking.getVerificationDeadline() != null && !Instant.now().isBefore(booking.getVerificationDeadline())) {
                expiration.expireOne(booking.getId());
            }
        }
    }
}
