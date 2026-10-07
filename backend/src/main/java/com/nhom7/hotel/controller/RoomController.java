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
        ApiResponse<RoomResponse> apiResponse = new ApiResponse<>();
        apiResponse.setResult(roomService.createRoom(request));
        return apiResponse;
    }

    @GetMapping("/room")
    ApiResponse<List<RoomResponse>> getRooms() {
        ApiResponse<List<RoomResponse>> apiResponse = new ApiResponse<>();
        apiResponse.setResult(roomService.getRooms());
        return apiResponse;
    }

    @GetMapping("/room/search")
    ApiResponse<List<RoomResponse>> searchAvailableRooms(
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate checkIn,
            @RequestParam @DateTimeFormat(iso = DateTimeFormat.ISO.DATE) LocalDate checkOut,
            @RequestParam(required = false) Integer guests,
            @RequestParam(required = false) String roomTypeId) {
        ApiResponse<List<RoomResponse>> apiResponse = new ApiResponse<>();
        apiResponse.setResult(roomService.searchAvailableRooms(checkIn, checkOut, guests, roomTypeId));
        return apiResponse;
    }

    @GetMapping("/room/{roomId}")
    ApiResponse<RoomResponse> getRoom(@PathVariable String roomId) {
        ApiResponse<RoomResponse> apiResponse = new ApiResponse<>();
        apiResponse.setResult(roomService.getRoom(roomId));
        return apiResponse;
    }

    @PutMapping("/room/{roomId}")
    ApiResponse<RoomResponse> updateRoom(@PathVariable String roomId, @RequestBody @Valid CreateRoomRequest request) {
        ApiResponse<RoomResponse> apiResponse = new ApiResponse<>();
        apiResponse.setResult(roomService.updateRoom(roomId, request));
        return apiResponse;
    }

    @PatchMapping("/room/{roomId}/status")
    ApiResponse<RoomResponse> updateRoomStatus(@PathVariable String roomId, @RequestParam RoomStatus status) {
        ApiResponse<RoomResponse> apiResponse = new ApiResponse<>();
        apiResponse.setResult(roomService.updateRoomStatus(roomId, status));
        return apiResponse;
    }

    @DeleteMapping("/room/{roomId}")
    ApiResponse<String> deleteRoom(@PathVariable String roomId) {
        roomService.deleteRoom(roomId);
        ApiResponse<String> apiResponse = new ApiResponse<>();
        apiResponse.setResult("Room has been deleted");
        return apiResponse;
    }

    @PostMapping("/room-type")
    ApiResponse<RoomTypeResponse> createRoomType(@RequestBody @Valid RoomTypeRequest request) {
        ApiResponse<RoomTypeResponse> apiResponse = new ApiResponse<>();
        apiResponse.setResult(roomService.createRoomType(request));
        return apiResponse;
    }

    @GetMapping("/room-type")
    ApiResponse<List<RoomTypeResponse>> getRoomTypes() {
        ApiResponse<List<RoomTypeResponse>> apiResponse = new ApiResponse<>();
        apiResponse.setResult(roomService.getRoomTypes());
        return apiResponse;
    }

    @GetMapping("/room-type/{roomTypeId}")
    ApiResponse<RoomTypeResponse> getRoomType(@PathVariable String roomTypeId) {
        ApiResponse<RoomTypeResponse> apiResponse = new ApiResponse<>();
        apiResponse.setResult(roomService.getRoomType(roomTypeId));
        return apiResponse;
    }

    @PutMapping("/room-type/{roomTypeId}")
    ApiResponse<RoomTypeResponse> updateRoomType(@PathVariable String roomTypeId,
                                                 @RequestBody @Valid RoomTypeRequest request) {
        ApiResponse<RoomTypeResponse> apiResponse = new ApiResponse<>();
        apiResponse.setResult(roomService.updateRoomType(roomTypeId, request));
        return apiResponse;
    }

    @DeleteMapping("/room-type/{roomTypeId}")
    ApiResponse<String> deleteRoomType(@PathVariable String roomTypeId) {
        roomService.deleteRoomType(roomTypeId);
        ApiResponse<String> apiResponse = new ApiResponse<>();
        apiResponse.setResult("Room type has been deleted");
        return apiResponse;
    }
}
