package com.nhom7.hotel.controller;

import com.nhom7.hotel.dto.request.CreateRoomRequest;
import com.nhom7.hotel.dto.request.RoomTypeRequest;
import com.nhom7.hotel.dto.response.ApiResponse;
import com.nhom7.hotel.dto.response.RoomResponse;
import com.nhom7.hotel.dto.response.RoomTypeResponse;
import com.nhom7.hotel.enums.RoomStatus;
import com.nhom7.hotel.service.RoomService;
import jakarta.validation.Valid;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.format.annotation.DateTimeFormat;
import org.springframework.web.bind.annotation.*;

import java.time.LocalDate;
import java.util.List;

@RestController
public class RoomController {
    @Autowired
    private RoomService roomService;

    @PostMapping("/room")
    ApiResponse<RoomResponse> createRoom(@RequestBody @Valid CreateRoomRequest request) {
        return ApiResponse.<RoomResponse>builder()
                .result(roomService.createRoom(request))
                .build();
    }

    @GetMapping("/room")
    ApiResponse<List<RoomResponse>> getRooms() {
        return ApiResponse.<List<RoomResponse>>builder()
                .result(roomService.getRooms())
                .build();
    }

    @GetMapping("/room/search")
    ApiResponse<List<RoomResponse>> searchAvailableRooms(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate checkIn,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate checkOut,
            @RequestParam(required = false) Integer guests,
            @RequestParam(required = false) String roomTypeId) {
        return ApiResponse.<List<RoomResponse>>builder()
                .result(roomService.searchAvailableRooms(checkIn, checkOut, guests, roomTypeId))
                .build();
    }

    @GetMapping("/room/{roomId}")
    ApiResponse<RoomResponse> getRoom(@PathVariable String roomId) {
        return ApiResponse.<RoomResponse>builder()
                .result(roomService.getRoom(roomId))
                .build();
    }

    @PutMapping("/room/{roomId}")
    ApiResponse<RoomResponse> updateRoom(@PathVariable String roomId, @RequestBody @Valid CreateRoomRequest request) {
        return ApiResponse.<RoomResponse>builder()
                .result(roomService.updateRoom(roomId, request))
                .build();
    }

    @PatchMapping("/room/{roomId}/status")
    ApiResponse<RoomResponse> updateRoomStatus(@PathVariable String roomId, @RequestParam RoomStatus status) {
        return ApiResponse.<RoomResponse>builder()
                .result(roomService.updateRoomStatus(roomId, status))
                .build();
    }

    @DeleteMapping("/room/{roomId}")
    ApiResponse<String> deleteRoom(@PathVariable String roomId) {
        roomService.deleteRoom(roomId);
        return ApiResponse.<String>builder()
                .result("Room has been deleted")
                .build();
    }

    @PostMapping("/room-type")
    ApiResponse<RoomTypeResponse> createRoomType(@RequestBody @Valid RoomTypeRequest request) {
        return ApiResponse.<RoomTypeResponse>builder()
                .result(roomService.createRoomType(request))
                .build();
    }

    @GetMapping("/room-type")
    ApiResponse<List<RoomTypeResponse>> getRoomTypes() {
        return ApiResponse.<List<RoomTypeResponse>>builder()
                .result(roomService.getRoomTypes())
                .build();
    }

    @GetMapping("/room-type/{roomTypeId}")
    ApiResponse<RoomTypeResponse> getRoomType(@PathVariable String roomTypeId) {
        return ApiResponse.<RoomTypeResponse>builder()
                .result(roomService.getRoomType(roomTypeId))
                .build();
    }

    @PutMapping("/room-type/{roomTypeId}")
    ApiResponse<RoomTypeResponse> updateRoomType(@PathVariable String roomTypeId,
                                                 @RequestBody @Valid RoomTypeRequest request) {
        return ApiResponse.<RoomTypeResponse>builder()
                .result(roomService.updateRoomType(roomTypeId, request))
                .build();
    }

    @DeleteMapping("/room-type/{roomTypeId}")
    ApiResponse<String> deleteRoomType(@PathVariable String roomTypeId) {
        roomService.deleteRoomType(roomTypeId);
        return ApiResponse.<String>builder()
                .result("Room type has been deleted")
                .build();
    }
}
