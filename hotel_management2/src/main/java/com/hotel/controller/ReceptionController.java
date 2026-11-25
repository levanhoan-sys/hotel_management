package com.hotel.controller;

import com.hotel.dto.request.AddServiceOrderRequest;
import com.hotel.dto.response.ApiResponse;
import com.hotel.dto.response.BookingResponse;
import com.hotel.dto.response.InvoiceResponse;
import com.hotel.service.InvoiceService;
import com.hotel.service.ReceptionService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

@RestController
@RequestMapping("/api/reception")
@RequiredArgsConstructor
public class ReceptionController {

    private final ReceptionService receptionService;
    private final InvoiceService invoiceService;

    @PostMapping("/bookings/{bookingId}/check-in")
    public ResponseEntity<ApiResponse<BookingResponse>> checkIn(@PathVariable Long bookingId) {
        BookingResponse response = receptionService.checkIn(bookingId);
        return ResponseEntity.ok(ApiResponse.ok(response, "Customer checked in successfully"));
    }

    @PostMapping("/bookings/{bookingId}/check-out")
    public ResponseEntity<ApiResponse<InvoiceResponse>> checkOut(@PathVariable Long bookingId) {
        InvoiceResponse response = invoiceService.completeCheckout(bookingId);
        return ResponseEntity.ok(ApiResponse.ok(response, "Check-out completed successfully"));
    }

    @PostMapping("/bookings/{bookingId}/services")
    public ResponseEntity<ApiResponse<BookingResponse>> addServiceToBooking(
            @PathVariable Long bookingId,
            @Valid @RequestBody AddServiceOrderRequest request) {
        BookingResponse response = receptionService.addServiceToBooking(bookingId, request);
        return ResponseEntity.ok(ApiResponse.ok(response, "Yêu cầu dịch vụ đã được gửi, chờ lễ tân duyệt"));
    }

    @PatchMapping("/rooms/{roomId}/cleaned")
    public ResponseEntity<ApiResponse<Void>> completeRoomCleaning(@PathVariable Long roomId) {
        receptionService.completeRoomCleaning(roomId);
        return ResponseEntity.ok(ApiResponse.ok(null, "Room marked as AVAILABLE"));
    }
}
