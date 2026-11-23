package com.hotel.controller;

import com.hotel.dto.request.CreateRoomRequest;
import com.hotel.dto.response.ApiResponse;
import com.hotel.dto.response.RoomResponse;
import com.hotel.enums.RoomStatus;
import com.hotel.service.RoomService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

@RestController
@RequestMapping("/api/rooms")
@RequiredArgsConstructor
public class RoomController {

    private final RoomService roomService;
    private final com.hotel.service.impl.RoomRecommendationService recommendationService;

    @PostMapping
    public ResponseEntity<ApiResponse<RoomResponse>> createRoom(@Valid @RequestBody CreateRoomRequest request) {
        RoomResponse response = roomService.createRoom(request);
        return ResponseEntity.status(HttpStatus.CREATED).body(ApiResponse.ok(response, "Room created successfully"));
    }

    @GetMapping
    public ResponseEntity<ApiResponse<List<RoomResponse>>> getAllRooms(
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate checkIn,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate checkOut,
            @RequestParam(required = false) Long roomTypeId,
            @RequestParam(required = false) Integer minCapacity,
            @RequestParam(required = false) BigDecimal minPrice,
            @RequestParam(required = false) BigDecimal maxPrice) {
        if (checkIn != null || checkOut != null || roomTypeId != null || minCapacity != null || minPrice != null || maxPrice != null) {
            return ResponseEntity.ok(ApiResponse.ok(roomService.searchRooms(checkIn, checkOut, roomTypeId, minCapacity, minPrice, maxPrice)));
        }
        return ResponseEntity.ok(ApiResponse.ok(roomService.searchRooms(null, null, null, null, null, null)));
    }

    @GetMapping("/{id}")
    public ResponseEntity<ApiResponse<RoomResponse>> getRoomById(@PathVariable Long id) {
        return ResponseEntity.ok(ApiResponse.ok(roomService.getRoomById(id)));
    }

    @GetMapping("/recommendations")
    public ResponseEntity<ApiResponse<List<com.hotel.dto.response.RoomRecommendationResponse>>> recommendations(
            @RequestParam(required = false) Long referenceRoomId,
            @RequestParam(required = false) Long roomTypeId,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate checkIn,
            @RequestParam(required = false) @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate checkOut,
            @RequestParam(required = false) Integer guests,
            @RequestParam(required = false, defaultValue = "1") Integer roomQuantity,
            @RequestParam(required = false, defaultValue = "false") boolean alternatives,
            @RequestParam(required = false, defaultValue = "4") Integer limit) {
        return ResponseEntity.ok(ApiResponse.ok(recommendationService.recommend(referenceRoomId, roomTypeId,
                checkIn, checkOut, guests, roomQuantity, alternatives, limit)));
    }

    @GetMapping("/{id}/calendar")
    public ApiResponse<List<com.hotel.dto.response.RoomDayResponse>> calendar(@PathVariable Long id,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate from,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate to) {
        return ApiResponse.ok(roomService.getRoomCalendar(id, from, to));
    }

    @GetMapping("/available")
    public ResponseEntity<ApiResponse<List<RoomResponse>>> getAvailableRooms(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate checkIn,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate checkOut) {
        return ResponseEntity.ok(ApiResponse.ok(roomService.getAvailableRoomsInDateRange(checkIn, checkOut)));
    }

    @PatchMapping("/{id}/status")
    public ResponseEntity<ApiResponse<Void>> updateRoomStatus(
            @PathVariable Long id,
            @RequestParam RoomStatus status) {
        roomService.updateRoomStatus(id, status);
        return ResponseEntity.ok(ApiResponse.ok(null, "Room status updated successfully"));
    }
}
