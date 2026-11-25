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

    @GetMapping("/service-usages/pending")
    public ApiResponse<List<ServiceUsageResponse>> pending() {
        return ApiResponse.ok(usages.getPendingUsages());
    }

    @PatchMapping("/service-usages/{usageId}/approve")
    public ApiResponse<ServiceUsageResponse> approve(@PathVariable Long usageId) {
        return ApiResponse.ok(usages.approveUsage(usageId), "Yêu cầu dịch vụ đã được duyệt");
    }

    @PatchMapping("/service-usages/{usageId}/reject")
    public ApiResponse<ServiceUsageResponse> reject(@PathVariable Long usageId) {
        return ApiResponse.ok(usages.rejectUsage(usageId), "Yêu cầu dịch vụ đã bị từ chối");
    }

    @PostMapping("/bookings/{bookingId}/service-usages")
    public ResponseEntity<ApiResponse<ServiceUsageResponse>> create(@PathVariable Long bookingId,
                                                                    @Valid @RequestBody CreateServiceUsageRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok(usages.addUsage(bookingId, request), "Service usage recorded"));
    }

    @PatchMapping("/service-usages/{usageId}/cancel")
    public ApiResponse<ServiceUsageResponse> cancel(@PathVariable Long usageId,
                                                    @Valid @RequestBody(required = false) CancelServiceUsageRequest request) {
        return ApiResponse.ok(usages.cancelUsage(usageId, request), "Service usage cancelled");
    }
}
