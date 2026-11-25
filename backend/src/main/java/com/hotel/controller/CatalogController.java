package com.hotel.controller;

import com.hotel.dto.response.ApiResponse;
import com.hotel.dto.response.RoomTypeResponse;
import com.hotel.dto.response.ServiceItemResponse;
import com.hotel.service.RoomService;
import com.hotel.service.ServiceUsageService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RestController;

import java.util.List;

@RestController
@RequiredArgsConstructor
public class CatalogController {
    private final RoomService roomService;
    private final ServiceUsageService serviceUsageService;

    @GetMapping("/api/room-types")
    public ApiResponse<List<RoomTypeResponse>> roomTypes() {
        return ApiResponse.ok(roomService.getRoomTypes());
    }

    @GetMapping("/api/services")
    public ApiResponse<List<ServiceItemResponse>> services() {
        return ApiResponse.ok(serviceUsageService.getActiveServices());
    }
}
