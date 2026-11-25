package com.hotel.service.impl;

import com.hotel.dto.request.AddServiceOrderRequest;
import com.hotel.dto.response.BookingResponse;
import com.hotel.entity.Booking;
import com.hotel.entity.BookingDetail;
import com.hotel.entity.Room;
import com.hotel.enums.BookingStatus;
import com.hotel.enums.RoomStatus;
import com.hotel.exception.BadRequestException;
import com.hotel.exception.ResourceNotFoundException;
import com.hotel.repository.BookingRepository;
import com.hotel.repository.RoomRepository;
import com.hotel.service.ReceptionService;
import com.hotel.service.ServiceUsageService;
import lombok.RequiredArgsConstructor;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.util.HashMap;
import java.util.List;
import java.util.Map;
import java.util.TreeSet;

@Service
@RequiredArgsConstructor
public class ReceptionServiceImpl implements ReceptionService {

    private final BookingRepository bookingRepository;
    private final RoomRepository roomRepository;
    private final ServiceUsageService serviceUsageService;

    @Override
    @Transactional
    public BookingResponse checkIn(Long bookingId) {
        Booking booking = bookingRepository.findByIdForUpdate(bookingId)
                .orElseThrow(() -> new ResourceNotFoundException("Booking not found with ID: " + bookingId));

        if (booking.getStatus() != BookingStatus.CONFIRMED) {
            throw new BadRequestException("Only CONFIRMED bookings can be checked in. Current status: " + booking.getStatus());
        }
        if (LocalDate.now().isBefore(booking.getCheckInDate())) {
            throw new BadRequestException("Chưa đến ngày nhận phòng");
        }

        if (booking.getDetails().isEmpty()) {
            throw new BadRequestException("Booking has no rooms");
        }
        TreeSet<Long> roomIds = new TreeSet<>();
        booking.getDetails().forEach(detail -> roomIds.add(detail.getRoom().getId()));
        List<Room> lockedRooms = roomRepository.findAllByIdForUpdate(List.copyOf(roomIds));
        if (lockedRooms.size() != roomIds.size()) {
            throw new BadRequestException("One or more booked rooms no longer exist");
        }
        Map<Long, Room> roomById = new HashMap<>();
        lockedRooms.forEach(room -> roomById.put(room.getId(), room));

        // Validate all rooms before mutating any; a failure leaves the entire booking unchanged.
        for (BookingDetail detail : booking.getDetails()) {
            Room room = roomById.get(detail.getRoom().getId());
            if (!room.isOperational() || room.getStatus() != RoomStatus.AVAILABLE) {
                throw new BadRequestException("Room " + room.getRoomNumber() + " is not ready for check-in");
            }
        }

        booking.checkIn();
        for (Room room : lockedRooms) {
            room.setStatus(RoomStatus.OCCUPIED);
        }

        Booking saved = bookingRepository.save(booking);
        return BookingResponse.fromEntity(saved);
    }

    @Override
    @Transactional
    public BookingResponse addServiceToBooking(Long bookingId, AddServiceOrderRequest request) {
        serviceUsageService.addLegacyUsage(bookingId, request);
        Booking booking = bookingRepository.findById(bookingId)
                .orElseThrow(() -> new ResourceNotFoundException("Booking not found with ID: " + bookingId));
        return BookingResponse.fromEntity(booking);
    }

    @Override
    @Transactional
    public void completeRoomCleaning(Long roomId) {
        Room room = roomRepository.findByIdForUpdate(roomId)
                .orElseThrow(() -> new ResourceNotFoundException("Room not found with ID: " + roomId));

        if (room.getStatus() != RoomStatus.CLEANING) {
            throw new BadRequestException("Room is not in CLEANING status");
        }

        room.setStatus(RoomStatus.AVAILABLE);
        roomRepository.save(room);
    }
}
