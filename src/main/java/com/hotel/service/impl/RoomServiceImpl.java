package com.hotel.service.impl;

import com.hotel.dto.request.CreateRoomRequest;
import com.hotel.dto.response.RoomResponse;
import com.hotel.dto.request.RoomTypeRequest;
import com.hotel.dto.request.CreateRoomBlockRequest;
import com.hotel.dto.response.RoomTypeResponse;
import com.hotel.dto.response.RoomBlockResponse;
import com.hotel.entity.Room;
import com.hotel.entity.RoomBlock;
import com.hotel.entity.RoomType;
import com.hotel.enums.RoomStatus;
import com.hotel.exception.BadRequestException;
import com.hotel.exception.ResourceNotFoundException;
import com.hotel.repository.RoomRepository;
import com.hotel.repository.RoomTypeRepository;
import com.hotel.repository.RoomBlockRepository;
import com.hotel.repository.BookingRepository;
import com.hotel.repository.ServiceItemRepository;
import com.hotel.service.RoomService;
import com.hotel.service.RoomTypeService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.List;

@Service
@RequiredArgsConstructor
public class RoomServiceImpl implements RoomService {

    private final RoomRepository roomRepository;
    private final RoomTypeRepository roomTypeRepository;
    private final RoomBlockRepository roomBlockRepository;
    private final BookingRepository bookingRepository;
    private final ServiceItemRepository serviceItemRepository;
    private final RoomTypeService roomTypeService;

    @Override
    @Transactional
    public RoomResponse createRoom(CreateRoomRequest request) {
        String roomNumber = request.getRoomNumber().trim();
        if (roomRepository.findByRoomNumber(roomNumber).isPresent()) {
            throw new com.hotel.exception.ConflictException("Room number " + roomNumber + " already exists");
        }

        RoomType roomType = roomTypeRepository.findById(request.getRoomTypeId())
                .orElseThrow(() -> new ResourceNotFoundException("Room type not found with ID: " + request.getRoomTypeId()));

        Room room = new Room();
        room.setRoomNumber(roomNumber);
        room.setFloor(request.getFloor());
        room.setRoomType(roomType);
        room.setServices(resolveServices(request.getServiceIds()));
        room.setStatus(RoomStatus.AVAILABLE);

        Room saved = roomRepository.save(room);
        return RoomResponse.fromEntity(saved);
    }

    @Override
    public List<RoomResponse> getAllRooms() {
        return roomRepository.findAll().stream()
                .map(RoomResponse::fromEntity)
                .toList();
    }

    @Override
    public RoomResponse getRoomById(Long id) {
        Room room = roomRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Room not found with ID: " + id));
        return RoomResponse.fromEntity(room);
    }

    @Override
    @Transactional(readOnly = true)
    public List<com.hotel.dto.response.RoomDayResponse> getRoomCalendar(Long id, LocalDate from, LocalDate to) {
        Room room = roomRepository.findById(id).orElseThrow(() -> new ResourceNotFoundException("Room not found"));
        if (from == null || to == null || to.isBefore(from) || to.isAfter(from.plusDays(61)))
            throw new BadRequestException("Calendar range must be between 1 and 62 days");
        return from.datesUntil(to.plusDays(1)).map(day -> {
            String status = !room.isOperational() || room.getStatus() == RoomStatus.MAINTENANCE ? "UNAVAILABLE"
                    : roomBlockRepository.existsOverlap(id, day, day.plusDays(1)) ? "BLOCKED"
                    : bookingRepository.existsRoomBookingOverlap(id, day, day.plusDays(1)) ? "BOOKED"
                    : "AVAILABLE";
            return new com.hotel.dto.response.RoomDayResponse(day, status);
        }).toList();
    }

    @Override
    public List<RoomResponse> getAvailableRoomsInDateRange(LocalDate checkIn, LocalDate checkOut) {
        return searchRooms(checkIn, checkOut, null, null, null, null);
    }

    @Override
    @Transactional
    public void updateRoomStatus(Long id, RoomStatus status) {
        Room room = roomRepository.findByIdForUpdate(id)
                .orElseThrow(() -> new ResourceNotFoundException("Room not found with ID: " + id));
        if (!room.isOperational() && status != RoomStatus.MAINTENANCE)
            throw new BadRequestException("An inactive room must be activated before changing its status");
        if (status == RoomStatus.MAINTENANCE && bookingRepository.existsActiveOrFutureBooking(id, LocalDate.now()))
            throw new BadRequestException("Room has an active or future booking");
        if (status == RoomStatus.AVAILABLE && room.getStatus() == RoomStatus.CLEANING) {
            room.setStatus(RoomStatus.AVAILABLE);
        } else if (status == RoomStatus.MAINTENANCE || status == RoomStatus.CLEANING) {
            room.setStatus(status);
        } else if (status != room.getStatus()) {
            throw new BadRequestException("Status can only be set to MAINTENANCE or CLEANING manually");
        }
    }

    @Override
    @Transactional
    public RoomResponse updateRoom(Long id, CreateRoomRequest request) {
        Room room = roomRepository.findByIdForUpdate(id).orElseThrow(() -> new ResourceNotFoundException("Room not found with ID: " + id));
        String roomNumber = request.getRoomNumber().trim();
        if (roomRepository.existsByRoomNumberAndIdNot(roomNumber, id)) throw new com.hotel.exception.ConflictException("Room number is already in use");
        RoomType type = roomTypeRepository.findById(request.getRoomTypeId()).orElseThrow(() -> new ResourceNotFoundException("Room type not found"));
        room.setRoomNumber(roomNumber);
        room.setFloor(request.getFloor());
        room.setRoomType(type);
        room.setServices(resolveServices(request.getServiceIds()));
        return RoomResponse.fromEntity(room);
    }

    @Override
    @Transactional
    public void setRoomOperational(Long id, boolean operational) {
        Room room = roomRepository.findByIdForUpdate(id).orElseThrow(() -> new ResourceNotFoundException("Room not found with ID: " + id));
        if (!operational && room.getStatus() == RoomStatus.OCCUPIED) throw new BadRequestException("An occupied room cannot be taken out of operation");
        if (!operational && bookingRepository.existsActiveOrFutureBooking(id, LocalDate.now())) throw new BadRequestException("Room has an active or future booking");
        room.setOperational(operational);
        if (!operational) room.setStatus(RoomStatus.MAINTENANCE);
        else if (room.getStatus() == RoomStatus.MAINTENANCE) room.setStatus(RoomStatus.AVAILABLE);
    }

    @Override
    @Transactional(readOnly = true)
    public List<RoomResponse> searchRooms(LocalDate checkIn, LocalDate checkOut, Long roomTypeId, Integer minCapacity, Double minPrice, Double maxPrice) {
        if ((checkIn == null) != (checkOut == null)) throw new BadRequestException("Both check-in and check-out dates are required");
        if (checkIn != null && !checkOut.isAfter(checkIn)) throw new BadRequestException("Check-out date must be after check-in date");
        if (minCapacity != null && minCapacity < 1) throw new BadRequestException("Minimum capacity must be at least 1");
        if (minPrice != null && minPrice < 0 || maxPrice != null && maxPrice < 0) throw new BadRequestException("Price filters cannot be negative");
        if (minPrice != null && maxPrice != null && minPrice > maxPrice) throw new BadRequestException("Minimum price cannot exceed maximum price");
        return roomRepository.searchRooms(checkIn, checkOut, roomTypeId, minCapacity, minPrice, maxPrice).stream().map(RoomResponse::fromEntity).toList();
    }

    @Override
    @Transactional(readOnly = true)
    public List<RoomTypeResponse> getRoomTypes() { return roomTypeService.getRoomTypes(); }

    @Override
    @Transactional
    public RoomTypeResponse createRoomType(RoomTypeRequest request) {
        return roomTypeService.createRoomType(request);
    }

    @Override
    @Transactional
    public RoomTypeResponse updateRoomType(Long id, RoomTypeRequest request) {
        return roomTypeService.updateRoomType(id, request);
    }

    private java.util.Set<com.hotel.entity.ServiceItem> resolveServices(java.util.Set<Long> ids) {
        if (ids == null || ids.isEmpty()) return new java.util.HashSet<>();
        java.util.Set<com.hotel.entity.ServiceItem> services = new java.util.HashSet<>(serviceItemRepository.findAllById(ids));
        if (services.size() != ids.size()) throw new ResourceNotFoundException("One or more services were not found");
        return services;
    }

    @Override
    @Transactional(readOnly = true)
    public List<RoomBlockResponse> getRoomBlocks(Long roomId) {
        if (!roomRepository.existsById(roomId)) throw new ResourceNotFoundException("Room not found");
        return roomBlockRepository.findByRoomIdOrderByStartDateAsc(roomId).stream().map(RoomBlockResponse::from).toList();
    }

    @Override
    @Transactional
    public RoomBlockResponse createRoomBlock(Long roomId, CreateRoomBlockRequest request) {
        Room room = roomRepository.findByIdForUpdate(roomId).orElseThrow(() -> new ResourceNotFoundException("Room not found"));
        if (!request.endDate().isAfter(request.startDate())) throw new BadRequestException("Block end date must be after start date");
        boolean blockIncludesToday = !request.startDate().isAfter(LocalDate.now()) && request.endDate().isAfter(LocalDate.now());
        if (room.getStatus() == RoomStatus.OCCUPIED && blockIncludesToday) throw new BadRequestException("An occupied room cannot be blocked for its current stay");
        if (bookingRepository.existsRoomBookingOverlap(roomId, request.startDate(), request.endDate())) throw new BadRequestException("Room has a booking during the selected dates");
        if (roomBlockRepository.existsOverlap(roomId, request.startDate(), request.endDate())) throw new com.hotel.exception.ConflictException("Room already has a block during the selected dates");
        return RoomBlockResponse.from(roomBlockRepository.save(new RoomBlock(room, request.startDate(), request.endDate(), request.reason().trim())));
    }

    @Override
    @Transactional
    public void deleteRoomBlock(Long blockId) {
        if (!roomBlockRepository.existsById(blockId)) throw new ResourceNotFoundException("Room block not found");
        roomBlockRepository.deleteById(blockId);
    }
}
