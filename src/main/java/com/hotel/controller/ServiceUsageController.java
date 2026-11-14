package com.hotel.controller;

import com.hotel.dto.request.CancelServiceUsageRequest;
import com.hotel.dto.request.CreateServiceUsageRequest;
import com.hotel.dto.response.ApiResponse;
import com.hotel.dto.response.ServiceUsageResponse;
import com.hotel.service.ServiceUsageService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/reception")
@RequiredArgsConstructor
public class ServiceUsageController {
    private final ServiceUsageService usages;

    @GetMapping("/bookings/{bookingId}/service-usages")
    public ApiResponse<List<ServiceUsageResponse>> list(@PathVariable Long bookingId) {
        return ApiResponse.ok(usages.getUsages(bookingId));
    }

    @PostMapping("/bookings/{bookingId}/service-usages")
    public ResponseEntity<ApiResponse<ServiceUsageResponse>> create(@PathVariable Long bookingId,
            @Valid @RequestBody CreateServiceUsageRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(usages.addUsage(bookingId, request), "Service usage recorded"));
    }

    @PatchMapping("/service-usages/{usageId}/cancel")
    public ApiResponse<ServiceUsageResponse> cancel(@PathVariable Long usageId,
            @Valid @RequestBody(required = false) CancelServiceUsageRequest request) {
        return ApiResponse.ok(usages.cancelUsage(usageId, request), "Service usage cancelled");
    }
}
