package com.hotel.service.impl;

import com.hotel.config.VietQrProperties;
import com.hotel.dto.response.VietQrResponse;
import com.hotel.entity.Booking;
import com.hotel.enums.BookingStatus;
import com.hotel.exception.BadRequestException;
import com.hotel.exception.ResourceNotFoundException;
import com.hotel.repository.BookingRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import org.springframework.web.util.UriComponentsBuilder;

import java.time.Instant;

@Service
@RequiredArgsConstructor
public class VietQrService {
    private final BookingRepository bookings;
    private final VietQrProperties bank;

    @Transactional(readOnly = true)
    public VietQrResponse generate(Long bookingId, String username, boolean receptionist) {
        Booking booking = bookings.findById(bookingId).orElseThrow(() -> new ResourceNotFoundException("Booking not found"));
        if (!receptionist && !booking.getCustomer().getUsername().equals(username)) throw new ResponseStatusException(HttpStatus.FORBIDDEN);
        bank.validate();
        if (!bank.configured()) throw new BadRequestException("VietQR receiving account is not configured");
        if (booking.getStatus() != BookingStatus.PENDING_DEPOSIT && booking.getStatus() != BookingStatus.PENDING_VERIFICATION)
            throw new BadRequestException("This booking is not eligible for deposit payment");
        Instant holdUntil = booking.getStatus() == BookingStatus.PENDING_VERIFICATION ? booking.getVerificationDeadline() : booking.getDepositDeadline();
        if (holdUntil == null || !Instant.now().isBefore(holdUntil)) throw new BadRequestException("Booking hold has expired");
        String content = booking.getTransferContent();
        if (content == null || content.isBlank()) throw new BadRequestException("Booking transfer reference is missing");
        String url = UriComponentsBuilder.fromHttpUrl("https://img.vietqr.io/image/" + bank.bin() + "-" + bank.accountNumber() + "-compact2.png")
                .queryParam("amount", booking.getDepositAmount().longValueExact())
                .queryParam("addInfo", content)
                .queryParam("accountName", bank.accountName())
                .build().encode().toUriString();
        return new VietQrResponse(booking.getId(), booking.getBookingCode(), booking.getDepositAmount(), content,
                bank.bin(), bank.accountNumber(), bank.accountName(), url, booking.getDepositDeadline(), booking.getVerificationDeadline());
    }
}
