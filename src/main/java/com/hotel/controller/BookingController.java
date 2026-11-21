package com.hotel.controller;

import com.hotel.dto.request.BookingRequest;
import com.hotel.dto.response.ApiResponse;
import com.hotel.dto.response.BookingResponse;
import com.hotel.service.BookingService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import org.springframework.security.core.Authentication;
import com.hotel.repository.CustomerRepository;
import com.hotel.exception.BadRequestException;
import com.hotel.service.ReceptionService;
import com.hotel.service.impl.CancellationPolicyService;
import com.hotel.dto.request.AddServiceOrderRequest;
import com.hotel.dto.request.BookingActionRequest;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;

@RestController
@RequestMapping("/api/bookings")
@RequiredArgsConstructor
public class BookingController {

    private final BookingService bookingService;
    private final CustomerRepository customers;
    private final ReceptionService receptionService;
    private final CancellationPolicyService cancellationPolicy;

    @PostMapping
    public ResponseEntity<ApiResponse<BookingResponse>> createBooking(@Valid @RequestBody BookingRequest request, Authentication authentication) {
        var customer = customers.findByUsername(authentication.getName()).orElseThrow(() -> new BadRequestException("Only a customer can create a personal booking"));
        request.setCustomerId(customer.getId());
        BookingResponse response = bookingService.createDepositBooking(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(response, "Booking created successfully"));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<BookingResponse>> getBookingById(@PathVariable Long id, Authentication authentication) {
        BookingResponse booking = bookingService.getBookingById(id);
        ensureOwnerOrStaff(booking, authentication);
        return ResponseEntity.ok(ApiResponse.ok(booking));
    }

    @GetMapping("/me")
    public ResponseEntity<ApiResponse<List<BookingResponse>>> getMyBookings(Authentication authentication) {
        var customer = customers.findByUsername(authentication.getName()).orElseThrow(() -> new BadRequestException("Tài khoản không phải khách hàng"));
        return ResponseEntity.ok(ApiResponse.ok(bookingService.getBookingsByCustomerId(customer.getId())));
    }

    @GetMapping("/my")
    public ResponseEntity<ApiResponse<?>> getMyBookingsPage(Authentication authentication,
            @RequestParam(defaultValue = "0") int page, @RequestParam(defaultValue = "20") int size) {
        if (page < 0 || size < 1 || size > 100) throw new BadRequestException("Invalid page or size");
        var customer = customers.findByUsername(authentication.getName()).orElseThrow(() -> new BadRequestException("Only a customer can view personal bookings"));
        return ResponseEntity.ok(ApiResponse.ok(bookingService.getBookingsByCustomerId(customer.getId(),
                PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt")))));
    }

    @PostMapping("/{id}/services")
    public ResponseEntity<ApiResponse<BookingResponse>> addService(@PathVariable Long id, @Valid @RequestBody AddServiceOrderRequest request, Authentication authentication) {
        ensureOwnerOrStaff(bookingService.getBookingById(id), authentication);
        return ResponseEntity.ok(ApiResponse.ok(receptionService.addServiceToBooking(id, request), "Yêu cầu dịch vụ đã được gửi, chờ lễ tân duyệt"));
    }

    @GetMapping("/customer/{customerId}")
    public ResponseEntity<ApiResponse<List<BookingResponse>>> getBookingsByCustomer(@PathVariable Long customerId, Authentication authentication) {
        var customer = customers.findByUsername(authentication.getName()).orElse(null);
        boolean staff = isReceptionist(authentication);
        if (!staff && (customer == null || !customer.getId().equals(customerId))) throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.FORBIDDEN);
        return ResponseEntity.ok(ApiResponse.ok(bookingService.getBookingsByCustomerId(customerId)));
    }

    @PatchMapping("/{id}/cancel")
    public ResponseEntity<ApiResponse<Void>> cancelBooking(@PathVariable Long id, Authentication authentication,
            @RequestBody(required = false) @Valid BookingActionRequest request) {
        ensureOwnerOrStaff(bookingService.getBookingById(id), authentication);
        cancellationPolicy.cancel(id, authentication.getName(), request == null ? null : request.reason());
        return ResponseEntity.ok(ApiResponse.ok(null, "Booking cancelled successfully"));
    }

    @GetMapping("/{id}/cancellation-preview")
    public ApiResponse<CancellationPolicyService.Preview> cancellationPreview(@PathVariable Long id, Authentication authentication) {
        return ApiResponse.ok(cancellationPolicy.preview(id, authentication.getName()));
    }

    private void ensureOwnerOrStaff(BookingResponse booking, Authentication auth) {
        boolean staff = isReceptionist(auth);
        var customer = customers.findByUsername(auth.getName()).orElse(null);
        if (!staff && (customer == null || !customer.getId().equals(booking.getCustomerId()))) throw new org.springframework.web.server.ResponseStatusException(org.springframework.http.HttpStatus.FORBIDDEN);
    }

    private boolean isReceptionist(Authentication auth) {
        return auth.getAuthorities().stream().anyMatch(a -> a.getAuthority().equals("ROLE_RECEPTIONIST"));
    }
}
