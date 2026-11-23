package com.hotel.controller;

import com.hotel.dto.response.ApiResponse;
import com.hotel.dto.response.RoomTypeResponse;
import com.hotel.dto.response.ServiceItemResponse;
import com.hotel.service.RoomTypeService;
import com.hotel.service.ServiceUsageService;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequiredArgsConstructor
public class CatalogController {
    private final RoomTypeService roomTypes;
    private final ServiceUsageService serviceUsageService;

    @GetMapping("/api/room-types")
    public ApiResponse<List<RoomTypeResponse>> roomTypes() { return ApiResponse.ok(roomTypes.getRoomTypes()); }

    @GetMapping("/api/services")
    public ApiResponse<List<ServiceItemResponse>> services() { return ApiResponse.ok(serviceUsageService.getActiveServices()); }
}
