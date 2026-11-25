package com.hotel.service.impl;

import com.hotel.dto.response.BookingResponse;
import com.hotel.dto.response.DepositResponse;
import com.hotel.dto.response.VietQrResponse;
import com.hotel.entity.Booking;
import com.hotel.entity.Payment;
import com.hotel.enums.BookingStatus;
import com.hotel.enums.PaymentMethod;
import com.hotel.enums.PaymentStatus;
import com.hotel.enums.PaymentType;
import com.hotel.exception.BadRequestException;
import com.hotel.exception.ConflictException;
import com.hotel.exception.ResourceNotFoundException;
import com.hotel.repository.BookingRepository;
import com.hotel.repository.PaymentRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDateTime;
import java.time.ZoneOffset;
import java.time.temporal.ChronoUnit;
import java.util.List;
import java.util.UUID;

@Service
@RequiredArgsConstructor
public class DepositPaymentService {
    private final BookingRepository bookings;
    private final PaymentRepository payments;
    private final VietQrService vietQr;

    @Transactional(readOnly = true)
    public DepositResponse status(Long bookingId, String username) {
        return status(bookingId, username, false);
    }

    @Transactional(readOnly = true)
    public DepositResponse status(Long bookingId, String username, boolean staff) {
        Booking booking = ownedOrStaffBooking(bookingId, username, staff);
        return DepositResponse.from(booking, latestDeposit(bookingId));
    }

    public VietQrResponse qr(Long bookingId, String username, boolean receptionist) {
        return vietQr.generate(bookingId, username, receptionist);
    }

    @Transactional
    public DepositResponse report(Long bookingId, String username) {
        return report(bookingId, username, false);
    }

    @Transactional
    public DepositResponse report(Long bookingId, String username, boolean staff) {
        Booking booking = lockedOwnedOrStaffBooking(bookingId, username, staff);
        Instant now = Instant.now();
        if (booking.getStatus() != BookingStatus.PENDING_DEPOSIT
                || booking.getDepositDeadline() == null
                || now.isAfter(booking.getDepositDeadline())) {
            throw new BadRequestException("Payment report must be received by the deposit deadline");
        }
        Payment payment = payments.findFirstByBookingIdAndTypeOrderByCreatedAtDesc(bookingId, PaymentType.DEPOSIT)
                .orElse(null);
        if (payment == null) {
            payment = payments.save(Payment.pendingDeposit(booking, "DEPOSIT-" + booking.getBookingCode()));
        }
        if (payment.getStatus() == PaymentStatus.REPORTED) {
            return DepositResponse.from(booking, payment);
        }
        if (payment.getStatus() != PaymentStatus.PENDING) {
            throw new ConflictException("Deposit payment cannot be reported in its current state");
        }
        payment.markReported(LocalDateTime.ofInstant(now, ZoneOffset.UTC));
        booking.setDepositReportedAt(now);
        booking.setVerificationDeadline(now.plus(30, ChronoUnit.MINUTES));
        booking.setStatus(BookingStatus.PENDING_VERIFICATION);
        return DepositResponse.from(booking, payment);
    }

    @Transactional(readOnly = true)
    public List<BookingResponse> pendingVerification() {
        return bookings.findByStatusOrderByDepositReportedAtAsc(BookingStatus.PENDING_VERIFICATION).stream()
                .map(BookingResponse::fromEntity)
                .toList();
    }

    @Transactional
    public DepositResponse confirm(Long bookingId, BigDecimal receivedAmount, String transactionReference, String receptionist) {
        Booking booking = bookings.findByIdForUpdate(bookingId)
                .orElseThrow(() -> new ResourceNotFoundException("Booking not found"));
        Payment payment = payments.findFirstByBookingIdAndTypeOrderByCreatedAtDesc(bookingId, PaymentType.DEPOSIT)
                .orElseThrow(() -> new BadRequestException("Deposit payment was not reported"));
        if (booking.getStatus() != BookingStatus.PENDING_VERIFICATION || payment.getStatus() != PaymentStatus.REPORTED) {
            throw new ConflictException("Deposit is not awaiting verification");
        }
        if (booking.getVerificationDeadline() == null || !Instant.now().isBefore(booking.getVerificationDeadline())) {
            throw new BadRequestException("Verification window has expired");
        }
        if (receivedAmount == null || receivedAmount.compareTo(booking.getDepositAmount()) != 0) {
            throw new BadRequestException("Received amount must exactly match the deposit amount");
        }
        if (transactionReference == null || transactionReference.isBlank() || transactionReference.length() > 255) {
            throw new BadRequestException("A valid bank transaction reference is required");
        }
        String reference = transactionReference.trim();
        if (payments.existsByMethodAndReferenceAndStatus(PaymentMethod.BANK_TRANSFER, reference, PaymentStatus.SUCCESSFUL)) {
            throw new ConflictException("This bank transaction reference has already been used");
        }
        payment.markSuccessful(reference);
        payment.setConfirmedTransactionReference(reference);
        payment.setConfirmedBy(receptionist);
        booking.setDepositPaidAt(Instant.now());
        booking.setDepositConfirmedBy(receptionist);
        booking.setStatus(BookingStatus.CONFIRMED);
        booking.setConfirmedAt(LocalDateTime.now());
        return DepositResponse.from(booking, payment);
    }

    @Transactional
    public DepositResponse reject(Long bookingId, String receptionist) {
        Booking booking = bookings.findByIdForUpdate(bookingId)
                .orElseThrow(() -> new ResourceNotFoundException("Booking not found"));
        Payment payment = payments.findFirstByBookingIdAndTypeOrderByCreatedAtDesc(bookingId, PaymentType.DEPOSIT)
                .orElseThrow(() -> new BadRequestException("Deposit payment was not reported"));
        if (booking.getStatus() != BookingStatus.PENDING_VERIFICATION || payment.getStatus() != PaymentStatus.REPORTED) {
            throw new ConflictException("Deposit is not awaiting verification");
        }
        payment.setStatus(PaymentStatus.FAILED);
        booking.setStatus(BookingStatus.EXPIRED);
        booking.setExpiredAt(Instant.now());
        booking.setRejectionReason("Deposit not verified by " + receptionist);
        return DepositResponse.from(booking, payment);
    }

    @Transactional
    public DepositResponse initiate(Long bookingId, String username, String key) {
        Booking booking = lockedOwnedOrStaffBooking(bookingId, username, false);
        if (booking.getStatus() != BookingStatus.PENDING_DEPOSIT || expired(booking)) {
            throw new BadRequestException("Booking is no longer awaiting a deposit");
        }
        String idempotencyKey = key == null || key.isBlank() ? UUID.randomUUID().toString() : key.trim();
        if (idempotencyKey.length() > 100) {
            throw new BadRequestException("Idempotency key is too long");
        }
        Payment existing = payments.findByIdempotencyKey(idempotencyKey).orElse(null);
        if (existing != null) {
            if (existing.getBooking() == null || !existing.getBooking().getId().equals(bookingId)
                    || existing.getType() != PaymentType.DEPOSIT) {
                throw new ConflictException("Idempotency key belongs to another payment");
            }
            return DepositResponse.from(booking, existing);
        }
        if (payments.existsByBookingIdAndTypeAndStatus(bookingId, PaymentType.DEPOSIT, PaymentStatus.SUCCESSFUL)) {
            throw new ConflictException("Deposit has already been paid");
        }
        return DepositResponse.from(booking, payments.save(Payment.pendingDeposit(booking, idempotencyKey)));
    }

    /** Sandbox only: the controller invoking this method is excluded from production profiles. */
    @Transactional
    public DepositResponse completeDemo(Long bookingId, Long paymentId, String username) {
        Booking booking = lockedOwnedOrStaffBooking(bookingId, username, false);
        Payment payment = payments.findById(paymentId)
                .orElseThrow(() -> new ResourceNotFoundException("Payment not found"));
        if (payment.getBooking() == null || !payment.getBooking().getId().equals(bookingId)
                || payment.getType() != PaymentType.DEPOSIT) {
            throw new BadRequestException("Payment does not belong to booking");
        }
        if (payment.getStatus() == PaymentStatus.SUCCESSFUL && booking.getStatus() == BookingStatus.CONFIRMED) {
            return DepositResponse.from(booking, payment);
        }
        if (payment.getStatus() != PaymentStatus.PENDING
                || booking.getStatus() != BookingStatus.PENDING_DEPOSIT
                || expired(booking)) {
            throw new BadRequestException("Deposit payment has expired or cannot be confirmed");
        }
        if (payment.getAmount().compareTo(booking.getDepositAmount()) != 0) {
            throw new ConflictException("Deposit amount differs from booking snapshot");
        }
        if (payments.existsByBookingIdAndTypeAndStatus(bookingId, PaymentType.DEPOSIT, PaymentStatus.SUCCESSFUL)) {
            throw new ConflictException("Deposit has already been paid");
        }
        payment.markSuccessful("DEMO-" + UUID.randomUUID());
        booking.setDepositPaidAt(Instant.now());
        booking.setStatus(BookingStatus.CONFIRMED);
        booking.setConfirmedAt(LocalDateTime.now());
        return DepositResponse.from(booking, payment);
    }

    private Booking ownedOrStaffBooking(Long id, String username, boolean staff) {
        Booking booking = bookings.findById(id).orElseThrow(() -> new ResourceNotFoundException("Booking not found"));
        if (!staff && !booking.getCustomer().getUsername().equals(username)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN);
        }
        return booking;
    }

    private Booking lockedOwnedOrStaffBooking(Long id, String username, boolean staff) {
        Booking booking = bookings.findByIdForUpdate(id).orElseThrow(() -> new ResourceNotFoundException("Booking not found"));
        if (!staff && !booking.getCustomer().getUsername().equals(username)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN);
        }
        return booking;
    }

    private Payment latestDeposit(Long bookingId) {
        List<Payment> list = payments.findByBookingIdOrderByCreatedAtDesc(bookingId);
        return list.stream().filter(p -> p.getType() == PaymentType.DEPOSIT).findFirst().orElse(null);
    }

    private boolean expired(Booking booking) {
        return booking.getDepositDeadline() == null || !Instant.now().isBefore(booking.getDepositDeadline());
    }
}
