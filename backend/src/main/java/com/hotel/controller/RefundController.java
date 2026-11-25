package com.hotel.controller;

import com.hotel.dto.response.ApiResponse;
import com.hotel.entity.Refund;
import com.hotel.exception.BadRequestException;
import com.hotel.exception.ResourceNotFoundException;
import com.hotel.repository.BookingRepository;
import com.hotel.repository.RefundRepository;
import jakarta.validation.Valid;
import jakarta.validation.constraints.NotBlank;
import jakarta.validation.constraints.Size;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDateTime;
import java.util.List;

@RestController
@RequiredArgsConstructor
public class RefundController {
    private final RefundRepository refunds;
    private final BookingRepository bookings;

    @GetMapping("/api/bookings/{bookingId}/refunds")
    @Transactional(readOnly = true)
    public ApiResponse<List<RefundView>> mine(@PathVariable Long bookingId, Authentication authentication) {
        var booking = bookings.findById(bookingId)
                .orElseThrow(() -> new ResourceNotFoundException("Booking not found"));
        boolean staff = authentication.getAuthorities().stream()
                .anyMatch(a -> "ROLE_RECEPTIONIST".equals(a.getAuthority()) || "ROLE_ADMIN".equals(a.getAuthority()));
        if (!staff && !booking.getCustomer().getUsername().equals(authentication.getName())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN);
        }
        return ApiResponse.ok(refunds.findByBookingId(bookingId).stream().map(RefundView::from).toList());
    }

    @GetMapping("/api/reception/refunds")
    @Transactional(readOnly = true)
    public ApiResponse<List<RefundView>> pending() {
        return ApiResponse.ok(refunds.findByStatusOrderByCreatedAtDesc("PENDING").stream()
                .map(RefundView::from)
                .toList());
    }

    @PostMapping("/api/reception/refunds/{id}/process")
    @Transactional
    public ApiResponse<RefundView> process(@PathVariable Long id, @Valid @RequestBody ProcessRequest request) {
        Refund refund = refunds.findByIdForUpdate(id)
                .orElseThrow(() -> new ResourceNotFoundException("Refund not found"));
        if (!"PENDING".equals(refund.getStatus())) {
            throw new BadRequestException("Refund is already processed");
        }
        refund.complete(request.reference().trim());
        return ApiResponse.ok(RefundView.from(refund));
    }

    public record ProcessRequest(@NotBlank @Size(max = 100) String reference) { }

    public record RefundView(Long id, Long bookingId, String code, BigDecimal amount, String status,
                             Instant completedAt, LocalDateTime createdAt, String reference) {
        public RefundView(Long id, Long bookingId, String code, BigDecimal amount, String status, Instant completedAt) {
            this(id, bookingId, code, amount, status, completedAt, null, null);
        }

        static RefundView from(Refund refund) {
            return new RefundView(refund.getId(), refund.getBooking().getId(), refund.getCode(),
                    refund.getAmount(), refund.getStatus(), refund.getCompletedAt(),
                    refund.getCreatedAt(), refund.getReference());
        }
    }
}
