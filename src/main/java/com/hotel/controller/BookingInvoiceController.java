package com.hotel.controller;

import com.hotel.dto.response.ApiResponse;
import com.hotel.dto.response.InvoiceResponse;
import com.hotel.exception.ResourceNotFoundException;
import com.hotel.repository.BookingRepository;
import com.hotel.service.InvoiceService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.PathVariable;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;
import org.springframework.web.server.ResponseStatusException;

@RestController
@RequestMapping("/api/bookings")
@RequiredArgsConstructor
public class BookingInvoiceController {
    private final BookingRepository bookings;
    private final InvoiceService invoices;

    @GetMapping("/{bookingId}/invoice")
    public ApiResponse<InvoiceResponse> getInvoice(@PathVariable Long bookingId, Authentication authentication) {
        var booking = bookings.findById(bookingId).orElseThrow(() -> new ResourceNotFoundException("Booking not found"));
        boolean receptionist = authentication.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_RECEPTIONIST"));
        if (!receptionist && !booking.getCustomer().getUsername().equals(authentication.getName()))
            throw new ResponseStatusException(HttpStatus.FORBIDDEN);
        return ApiResponse.ok(invoices.getInvoiceByBookingId(bookingId));
    }
}
