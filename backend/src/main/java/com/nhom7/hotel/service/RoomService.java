package com.nhom7.hotel.service;

import com.nhom7.hotel.dto.request.CreateRoomRequest;
import com.nhom7.hotel.dto.request.RoomTypeRequest;
import com.nhom7.hotel.dto.response.RoomResponse;
import com.nhom7.hotel.dto.response.RoomTypeResponse;
import com.nhom7.hotel.entity.Room;
import com.nhom7.hotel.entity.RoomType;
import com.nhom7.hotel.enums.PricingType;
import com.nhom7.hotel.enums.RoomStatus;
import com.nhom7.hotel.exception.AppException;
import com.nhom7.hotel.exception.ErrorCode;
import com.nhom7.hotel.mapper.RoomMapper;
import com.nhom7.hotel.repository.RoomRepository;
import com.nhom7.hotel.repository.RoomTypeRepository;
import com.nhom7.hotel.strategy.pricing.PricingStrategy;
import com.nhom7.hotel.strategy.pricing.PricingStrategyFactory;
import lombok.AccessLevel;
import lombok.RequiredArgsConstructor;
import lombok.experimental.FieldDefaults;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.temporal.ChronoUnit;
import java.util.List;

@Service
@RequiredArgsConstructor
@FieldDefaults(level = AccessLevel.PRIVATE, makeFinal = true)
public class RoomService {
    RoomRepository roomRepository;
    RoomTypeRepository roomTypeRepository;
    RoomMapper roomMapper;
    PricingStrategyFactory pricingStrategyFactory;

    @Transactional
    public RoomResponse createRoom(CreateRoomRequest request) {
        String roomNumber = request.getRoomNumber().trim();
        if (roomRepository.existsByRoomNumber(roomNumber)) {
            throw new AppException(ErrorCode.Room_Existed);
        }
        Room room = new Room();
        room.setRoomNumber(roomNumber);
        room.setFloor(request.getFloor());
        room.setRoomType(findRoomType(request.getRoomTypeId()));
        return roomMapper.toRoomResponse(roomRepository.save(room));
    }

    @Transactional
    public RoomResponse updateRoom(String id, CreateRoomRequest request) {
        Room room = findRoom(id);
        String roomNumber = request.getRoomNumber().trim();
        if (roomRepository.existsByRoomNumberAndIdNot(roomNumber, id)) {
            throw new AppException(ErrorCode.Room_Existed);
        }
        room.setRoomNumber(roomNumber);
        room.setFloor(request.getFloor());
        room.setRoomType(findRoomType(request.getRoomTypeId()));
        return roomMapper.toRoomResponse(roomRepository.save(room));
    }

    @Transactional
    public void deleteRoom(String id) {
        Room room = findRoom(id);
        if (room.getStatus() == RoomStatus.BOOKED || room.getStatus() == RoomStatus.OCCUPIED) {
            throw new AppException(ErrorCode.Room_In_Use);
        }
        roomRepository.delete(room);
    }

    @Transactional(readOnly = true)
    public RoomResponse getRoom(String id) {
        return roomMapper.toRoomResponse(findRoom(id));
    }

    @Transactional(readOnly = true)
    public List<RoomResponse> getRooms() {
        return roomRepository.findAllWithRoomType().stream()
                .map(roomMapper::toRoomResponse)
                .toList();
    }

    @Transactional(readOnly = true)
    public List<RoomResponse> searchAvailableRooms(LocalDate checkIn, LocalDate checkOut,
                                                   Integer guests, String roomTypeId) {
        if (checkIn == null || checkOut == null || checkIn.isBefore(LocalDate.now())
                || !checkOut.isAfter(checkIn)) {
            throw new AppException(ErrorCode.Invalid_Date_Range);
        }
        if (guests != null && guests <= 0) {
            throw new AppException(ErrorCode.Invalid_Guests);
        }

        int nights = (int) ChronoUnit.DAYS.between(checkIn, checkOut);
        PricingType pricingType = pricingStrategyFactory.resolveType(checkIn, checkOut);
        PricingStrategy strategy = pricingStrategyFactory.create(pricingType);

        return roomRepository.findAvailableRooms(checkIn, checkOut, guests, roomTypeId).stream()
                .map(room -> {
                    RoomResponse response = roomMapper.toRoomResponse(room);
                    response.setNights(nights);
                    response.setTotalPrice(room.calculateFinalPrice(nights, strategy));
                    response.setPricingType(pricingType);
                    return response;
                })
                .toList();
    }

    @Transactional
    public RoomResponse updateRoomStatus(String id, RoomStatus status) {
        Room room = findRoom(id);
        try {
            room.changeStatus(status);
        } catch (IllegalStateException | IllegalArgumentException ex) {
            throw new AppException(ErrorCode.Room_Invalid_Status);
        }
        return roomMapper.toRoomResponse(roomRepository.save(room));
    }

    @Transactional
    public RoomTypeResponse createRoomType(RoomTypeRequest request) {
        if (roomTypeRepository.existsByNameIgnoreCase(request.getName().trim())) {
            throw new AppException(ErrorCode.RoomType_Existed);
        }
        RoomType roomType = roomMapper.toRoomType(request);
        roomType.setName(request.getName().trim());
        return roomMapper.toRoomTypeResponse(roomTypeRepository.save(roomType));
    }

    @Transactional
    public RoomTypeResponse updateRoomType(String id, RoomTypeRequest request) {
        RoomType roomType = findRoomType(id);
        if (roomTypeRepository.existsByNameIgnoreCaseAndIdNot(request.getName().trim(), id)) {
            throw new AppException(ErrorCode.RoomType_Existed);
        }
        roomMapper.updateRoomType(roomType, request);
        roomType.setName(request.getName().trim());
        return roomMapper.toRoomTypeResponse(roomTypeRepository.save(roomType));
    }

    @Transactional
    public void deleteRoomType(String id) {
        RoomType roomType = findRoomType(id);
        if (roomRepository.existsByRoomTypeId(id)) {
            throw new AppException(ErrorCode.RoomType_In_Use);
        }
        roomTypeRepository.delete(roomType);
    }

    @Transactional(readOnly = true)
    public RoomTypeResponse getRoomType(String id) {
        return roomMapper.toRoomTypeResponse(findRoomType(id));
    }

    @Transactional(readOnly = true)
    public List<RoomTypeResponse> getRoomTypes() {
        return roomTypeRepository.findAll().stream()
                .map(roomMapper::toRoomTypeResponse)
                .toList();
    }

    private Room findRoom(String id) {
        return roomRepository.findById(id).orElseThrow(() -> new AppException(ErrorCode.Room_Notfound));
    }

    private RoomType findRoomType(String id) {
        return roomTypeRepository.findById(id).orElseThrow(() -> new AppException(ErrorCode.RoomType_Notfound));
    }
}
