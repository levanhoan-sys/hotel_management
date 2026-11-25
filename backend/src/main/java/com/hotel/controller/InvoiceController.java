package com.hotel.controller;

import com.hotel.dto.request.CheckOutRequest;
import com.hotel.dto.response.ApiResponse;
import com.hotel.dto.response.InvoiceResponse;
import com.hotel.exception.ResourceNotFoundException;
import com.hotel.repository.BookingRepository;
import com.hotel.service.InvoiceService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/invoices")
@RequiredArgsConstructor
public class InvoiceController {

    private final InvoiceService invoiceService;
    private final BookingRepository bookings;

    @PostMapping("/checkout/{bookingId}")
    public ResponseEntity<ApiResponse<InvoiceResponse>> checkOutAndPay(
            @PathVariable Long bookingId,
            @Valid @RequestBody CheckOutRequest request,
            Authentication authentication) {
        verifyAccess(bookingId, authentication);
        InvoiceResponse response = invoiceService.checkOutAndPay(bookingId, request);
        return ResponseEntity.ok(ApiResponse.ok(response, "Check-out and payment completed successfully"));
    }

    @GetMapping("/booking/{bookingId}")
    public ResponseEntity<ApiResponse<InvoiceResponse>> getInvoiceByBookingId(@PathVariable Long bookingId,
                                                                              Authentication authentication) {
        verifyAccess(bookingId, authentication);
        return ResponseEntity.ok(ApiResponse.ok(invoiceService.getInvoiceByBookingId(bookingId)));
    }

    private void verifyAccess(Long bookingId, Authentication authentication) {
        var booking = bookings.findById(bookingId)
                .orElseThrow(() -> new ResourceNotFoundException("Booking not found with ID: " + bookingId));
        boolean staff = authentication.getAuthorities().stream()
                .anyMatch(a -> "ROLE_RECEPTIONIST".equals(a.getAuthority()) || "ROLE_ADMIN".equals(a.getAuthority()));
        if (!staff && !booking.getCustomer().getUsername().equals(authentication.getName())) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN);
        }
    }
}
