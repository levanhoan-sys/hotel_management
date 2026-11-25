package com.hotel.controller;

import com.hotel.dto.request.BookingActionRequest;
import com.hotel.dto.request.BookingRequest;
import com.hotel.dto.request.ChangeBookingRoomsRequest;
import com.hotel.dto.response.ApiResponse;
import com.hotel.dto.response.BookingResponse;
import com.hotel.exception.BadRequestException;
import com.hotel.service.BookingService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.PageRequest;
import org.springframework.data.domain.Sort;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/reception/bookings")
@RequiredArgsConstructor
public class BookingManagementController {
    private final BookingService bookings;

    @PostMapping
    public ResponseEntity<ApiResponse<BookingResponse>> create(@Valid @RequestBody BookingRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok(bookings.createBooking(request), "Booking created successfully"));
    }

    @PatchMapping("/{id}/confirm")
    public ApiResponse<BookingResponse> confirm(@PathVariable Long id) {
        return ApiResponse.ok(bookings.confirmBooking(id), "Booking confirmed");
    }

    @PatchMapping("/{id}/reject")
    public ApiResponse<BookingResponse> reject(@PathVariable Long id,
                                               @Valid @RequestBody(required = false) BookingActionRequest request) {
        return ApiResponse.ok(bookings.rejectBooking(id, request == null ? null : request.reason()), "Booking rejected");
    }

    @PatchMapping("/{id}/cancel")
    public ApiResponse<Void> cancel(@PathVariable Long id, Authentication authentication,
                                    @Valid @RequestBody(required = false) BookingActionRequest request) {
        bookings.cancelBooking(id, authentication.getName(), request == null ? null : request.reason());
        return ApiResponse.ok(null, "Booking cancelled successfully");
    }

    @PutMapping("/{id}/rooms")
    public ApiResponse<BookingResponse> changeRooms(@PathVariable Long id,
                                                    @Valid @RequestBody ChangeBookingRoomsRequest request) {
        return ApiResponse.ok(bookings.changeRooms(id, request), "Booking rooms updated");
    }

    @GetMapping("/page")
    public ApiResponse<?> page(@RequestParam(defaultValue = "0") int page,
                               @RequestParam(defaultValue = "20") int size) {
        if (page < 0 || size < 1 || size > 100) {
            throw new BadRequestException("Invalid page or size");
        }
        return ApiResponse.ok(bookings.getAllBookings(
                PageRequest.of(page, size, Sort.by(Sort.Direction.DESC, "createdAt"))));
    }
}
