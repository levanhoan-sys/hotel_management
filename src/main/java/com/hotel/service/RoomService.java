package com.hotel.service;

import com.hotel.dto.request.CreateRoomRequest;
import com.hotel.dto.response.RoomResponse;
import com.hotel.dto.request.RoomTypeRequest;
import com.hotel.dto.request.CreateRoomBlockRequest;
import com.hotel.dto.response.RoomTypeResponse;
import com.hotel.dto.response.RoomBlockResponse;
import com.hotel.enums.RoomStatus;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.List;

public interface RoomService {
    RoomResponse createRoom(CreateRoomRequest request);
    List<RoomResponse> getAllRooms();
    RoomResponse getRoomById(Long id);
    List<com.hotel.dto.response.RoomDayResponse> getRoomCalendar(Long id, LocalDate from, LocalDate to);
    List<RoomResponse> getAvailableRoomsInDateRange(LocalDate checkIn, LocalDate checkOut);
    void updateRoomStatus(Long id, RoomStatus status);
    RoomResponse updateRoom(Long id, CreateRoomRequest request);
    void setRoomOperational(Long id, boolean operational);
    List<RoomResponse> searchRooms(LocalDate checkIn, LocalDate checkOut, Long roomTypeId,
                                   Integer minCapacity, BigDecimal minPrice, BigDecimal maxPrice);
    List<RoomTypeResponse> getRoomTypes();
    RoomTypeResponse createRoomType(RoomTypeRequest request);
    RoomTypeResponse updateRoomType(Long id, RoomTypeRequest request);
    List<RoomBlockResponse> getRoomBlocks(Long roomId);
    RoomBlockResponse createRoomBlock(Long roomId, CreateRoomBlockRequest request);
    void deleteRoomBlock(Long blockId);
}
