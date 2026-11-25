package com.hotel.controller;

import com.hotel.dto.request.CreateRoomBlockRequest;
import com.hotel.dto.request.CreateRoomRequest;
import com.hotel.dto.request.RoomTypeRequest;
import com.hotel.dto.response.ApiResponse;
import com.hotel.dto.response.RoomBlockResponse;
import com.hotel.dto.response.RoomResponse;
import com.hotel.dto.response.RoomTypeResponse;
import com.hotel.enums.RoomStatus;
import com.hotel.service.RoomService;
import jakarta.validation.Valid;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;

@RestController
@RequestMapping("/api/reception")
@RequiredArgsConstructor
public class RoomManagementController {
    private final RoomService rooms;

    @GetMapping("/rooms")
    public ApiResponse<List<RoomResponse>> rooms() {
        return ApiResponse.ok(rooms.getAllRooms());
    }

    @PostMapping("/rooms")
    public ResponseEntity<ApiResponse<RoomResponse>> createRoom(@Valid @RequestBody CreateRoomRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok(rooms.createRoom(request), "Room created successfully"));
    }

    @PutMapping("/rooms/{id}")
    public ApiResponse<RoomResponse> updateRoom(@PathVariable Long id, @Valid @RequestBody CreateRoomRequest request) {
        return ApiResponse.ok(rooms.updateRoom(id, request), "Room updated successfully");
    }

    @PatchMapping("/rooms/{id}/status")
    public ApiResponse<Void> updateStatus(@PathVariable Long id, @RequestParam RoomStatus status) {
        rooms.updateRoomStatus(id, status);
        return ApiResponse.ok(null, "Room status updated successfully");
    }

    @PatchMapping("/rooms/{id}/operational")
    public ApiResponse<Void> setOperational(@PathVariable Long id, @RequestParam boolean active) {
        rooms.setRoomOperational(id, active);
        return ApiResponse.ok(null, active ? "Room activated" : "Room taken out of operation");
    }

    @GetMapping("/room-types")
    public ApiResponse<List<RoomTypeResponse>> roomTypes() {
        return ApiResponse.ok(rooms.getRoomTypes());
    }

    @PostMapping("/room-types")
    public ResponseEntity<ApiResponse<RoomTypeResponse>> createRoomType(@Valid @RequestBody RoomTypeRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok(rooms.createRoomType(request), "Room type created successfully"));
    }

    @PutMapping("/room-types/{id}")
    public ApiResponse<RoomTypeResponse> updateRoomType(@PathVariable Long id,
                                                        @Valid @RequestBody RoomTypeRequest request) {
        return ApiResponse.ok(rooms.updateRoomType(id, request), "Room type updated successfully");
    }

    @GetMapping("/rooms/{roomId}/blocks")
    public ApiResponse<List<RoomBlockResponse>> roomBlocks(@PathVariable Long roomId) {
        return ApiResponse.ok(rooms.getRoomBlocks(roomId));
    }

    @PostMapping("/rooms/{roomId}/blocks")
    public ResponseEntity<ApiResponse<RoomBlockResponse>> createBlock(@PathVariable Long roomId,
                                                                      @Valid @RequestBody CreateRoomBlockRequest request) {
        return ResponseEntity.status(HttpStatus.CREATED)
                .body(ApiResponse.ok(rooms.createRoomBlock(roomId, request), "Room block created"));
    }

    @DeleteMapping("/room-blocks/{blockId}")
    public ApiResponse<Void> deleteBlock(@PathVariable Long blockId) {
        rooms.deleteRoomBlock(blockId);
        return ApiResponse.ok(null, "Room block deleted");
    }
}
