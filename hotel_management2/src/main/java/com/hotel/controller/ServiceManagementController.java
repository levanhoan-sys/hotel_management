package com.hotel.controller;

import com.hotel.dto.request.ServiceItemRequest;
import com.hotel.dto.response.ApiResponse;
import com.hotel.dto.response.ServiceItemResponse;
import com.hotel.service.ServiceUsageService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/reception/services")
@RequiredArgsConstructor
public class ServiceManagementController {
    private final ServiceUsageService services;

    @GetMapping
    public ApiResponse<List<ServiceItemResponse>> list() { return ApiResponse.ok(services.getAllServices()); }

    @PostMapping
    public ResponseEntity<ApiResponse<ServiceItemResponse>> create(@Valid @RequestBody ServiceItemRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(services.createService(request), "Service created"));
    }

    @PutMapping("/{id}")
    public ApiResponse<ServiceItemResponse> update(@PathVariable Long id, @Valid @RequestBody ServiceItemRequest request) {
        return ApiResponse.ok(services.updateService(id, request), "Service updated");
    }

    @PatchMapping("/{id}/active")
    public ApiResponse<ServiceItemResponse> setActive(@PathVariable Long id, @RequestParam boolean active) {
        return ApiResponse.ok(services.setServiceActive(id, active), active ? "Service enabled" : "Service disabled");
    }
}
