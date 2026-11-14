package com.hotel.service.impl;

import com.hotel.dto.request.BookingRequest;
import com.hotel.config.HotelBookingProperties;
import com.hotel.dto.request.ChangeBookingRoomsRequest;
import com.hotel.dto.response.BookingResponse;
import com.hotel.entity.Booking;
import com.hotel.entity.BookingDetail;
import com.hotel.entity.Customer;
import com.hotel.entity.Room;
import com.hotel.enums.BookingStatus;
import com.hotel.enums.RoomStatus;
import com.hotel.exception.BadRequestException;
import com.hotel.exception.ConflictException;
import com.hotel.exception.ResourceNotFoundException;
import com.hotel.repository.BookingRepository;
import com.hotel.repository.CustomerRepository;
import com.hotel.repository.RoomBlockRepository;
import com.hotel.repository.RoomRepository;
import com.hotel.service.BookingService;
import com.hotel.strategy.pricing.PricingStrategy;
import com.hotel.strategy.pricing.PricingStrategyFactory;
import lombok.RequiredArgsConstructor;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDate;
import java.time.Instant;
import java.math.BigDecimal;
import java.math.RoundingMode;
import java.util.HashSet;
import java.util.List;
import java.util.Map;
import java.util.ArrayList;
import java.util.TreeSet;

@Service
@RequiredArgsConstructor
public class BookingServiceImpl implements BookingService {
    private final BookingRepository bookingRepository;
    private final CustomerRepository customerRepository;
    private final RoomRepository roomRepository;
    private final RoomBlockRepository roomBlockRepository;
    private final PricingStrategyFactory pricingStrategyFactory;
    private final HotelBookingProperties bookingProperties;

    @Override
    @Transactional
    public BookingResponse createBooking(BookingRequest request) {
        return createBookingInternal(request, false);
    }

    @Override
    @Transactional
    public BookingResponse createDepositBooking(BookingRequest request) {
        return createBookingInternal(request, true);
    }

    private BookingResponse createBookingInternal(BookingRequest request, boolean depositRequired) {
        if (request.getCustomerId() == null) throw new BadRequestException("Customer is required");
        Customer customer = customerRepository.findById(request.getCustomerId())
                .orElseThrow(() -> new ResourceNotFoundException("Customer not found with ID: " + request.getCustomerId()));
        validateBookingRequest(request);

        List<Long> requestedIds = request.getRoomIds();
        if (requestedIds.stream().anyMatch(id -> id == null || id <= 0)) throw new BadRequestException("Room IDs must be positive");
        if (new HashSet<>(requestedIds).size() != requestedIds.size()) throw new BadRequestException("A room cannot appear more than once in a booking");

        // Lock rooms by ascending ID so booking creation and maintenance scheduling share a lock order.
        List<Long> sortedIds = requestedIds.stream().sorted().toList();
        List<Room> rooms = roomRepository.findAllByIdForUpdate(sortedIds);
        if (rooms.size() != requestedIds.size()) throw new ResourceNotFoundException("One or more selected rooms do not exist");

        for (Room room : rooms) {
            boolean checkInIsToday = request.getCheckInDate().isEqual(LocalDate.now());
            if (!room.isOperational() || room.getStatus() == RoomStatus.MAINTENANCE
                    || (checkInIsToday && room.getStatus() != RoomStatus.AVAILABLE))
                throw new ConflictException("Room " + room.getRoomNumber() + " is not operational or available");
            if (bookingRepository.existsRoomBookingOverlap(room.getId(), request.getCheckInDate(), request.getCheckOutDate()))
                throw new ConflictException("Room " + room.getRoomNumber() + " is already booked for the selected dates");
            if (roomBlockRepository.existsOverlap(room.getId(), request.getCheckInDate(), request.getCheckOutDate()))
                throw new ConflictException("Room " + room.getRoomNumber() + " is blocked for the selected dates");

            int guests = guestCount(request.getGuestCounts(), room.getId());
            if (guests < 1) throw new BadRequestException("Each room must have at least one guest");
            if (guests > room.getRoomType().getCapacity())
                throw new BadRequestException("Guest count exceeds capacity for room " + room.getRoomNumber());
        }
        validateGuestCountKeys(request.getGuestCounts(), requestedIds);

        Customer owner = customer;
        PricingStrategy pricing = pricingStrategyFactory.getStrategy(request.getPricingType());
        Booking booking = new Booking(owner, request.getCheckInDate(), request.getCheckOutDate());
        booking.setStatus(depositRequired ? BookingStatus.PENDING_DEPOSIT : BookingStatus.PENDING);
        for (Room room : rooms) {
            double fixedNightlyPrice = pricing.computePrice(room.getRoomType().getBasePrice(), 1);
            booking.addBookingDetail(room, fixedNightlyPrice, guestCount(request.getGuestCounts(), room.getId()));
        }

        if (depositRequired) {
            BigDecimal roomTotal = booking.getDetails().stream()
                    .map(detail -> BigDecimal.valueOf(detail.getPricePerNight()).multiply(BigDecimal.valueOf(booking.getNumberOfNights())))
                    .reduce(BigDecimal.ZERO, BigDecimal::add);
            booking.setDepositRate(bookingProperties.depositRate());
            booking.setDepositAmount(roomTotal.multiply(bookingProperties.depositRate()).setScale(0, RoundingMode.HALF_UP));
            booking.setDepositDeadline(Instant.now().plusSeconds(bookingProperties.depositTimeoutMinutes() * 60L));
            booking.setTransferContent("COC " + booking.getBookingCode().replaceAll("[^A-Z0-9]", ""));
            booking.setCancellationFreeHoursSnapshot(bookingProperties.cancellationFreeHours());
            booking.setCancellationPartialHoursSnapshot(bookingProperties.cancellationPartialHours());
        }

        return BookingResponse.fromEntity(bookingRepository.save(booking));
    }

    private void validateBookingRequest(BookingRequest request) {
        if (request.getCheckInDate() == null || request.getCheckOutDate() == null)
            throw new BadRequestException("Check-in and check-out dates are required");
        if (request.getCheckInDate().isBefore(LocalDate.now())) throw new BadRequestException("Check-in date cannot be in the past");
        if (!request.getCheckOutDate().isAfter(request.getCheckInDate()))
            throw new BadRequestException("Check-out date must be strictly after check-in date");
        if (request.getRoomIds() == null || request.getRoomIds().isEmpty()) throw new BadRequestException("At least one room is required");
    }

    private int guestCount(Map<Long, Integer> guestCounts, Long roomId) {
        if (guestCounts == null) return 1;
        Integer count = guestCounts.get(roomId);
        return count == null ? 1 : count;
    }

    private void validateGuestCountKeys(Map<Long, Integer> guestCounts, List<Long> roomIds) {
        if (guestCounts == null) return;
        if (!new HashSet<>(roomIds).containsAll(guestCounts.keySet()))
            throw new BadRequestException("Guest counts can only be supplied for rooms in this booking");
    }

    @Override
    @Transactional(readOnly = true)
    public BookingResponse getBookingById(Long id) {
        Booking booking = bookingRepository.findById(id)
                .orElseThrow(() -> new ResourceNotFoundException("Booking not found with ID: " + id));
        return BookingResponse.fromEntity(booking);
    }

    @Override
    @Transactional(readOnly = true)
    public List<BookingResponse> getBookingsByCustomerId(Long customerId) {
        return bookingRepository.findByCustomerIdOrderByCreatedAtDesc(customerId).stream().map(BookingResponse::fromEntity).toList();
    }

    @Override
    @Transactional(readOnly = true)
    public Page<BookingResponse> getAllBookings(Pageable pageable) {
        return bookingRepository.findAllByOrderByCreatedAtDesc(pageable).map(BookingResponse::fromEntity);
    }

    @Override
    @Transactional(readOnly = true)
    public Page<BookingResponse> getBookingsByCustomerId(Long customerId, Pageable pageable) {
        return bookingRepository.findByCustomerIdOrderByCreatedAtDesc(customerId, pageable).map(BookingResponse::fromEntity);
    }

    @Override
    @Transactional
    public BookingResponse changeRooms(Long bookingId, ChangeBookingRoomsRequest request) {
        Booking booking = bookingRepository.findByIdForUpdate(bookingId)
                .orElseThrow(() -> new ResourceNotFoundException("Booking not found with ID: " + bookingId));
        if (booking.getStatus() != BookingStatus.PENDING && booking.getStatus() != BookingStatus.CONFIRMED)
            throw new BadRequestException("Rooms can only be changed for pending or confirmed bookings");
        List<Long> requestedIds = request.roomIds();
        if (requestedIds == null || requestedIds.isEmpty()) throw new BadRequestException("At least one room is required");
        if (requestedIds.stream().anyMatch(id -> id == null || id <= 0)) throw new BadRequestException("Room IDs must be positive");
        if (new HashSet<>(requestedIds).size() != requestedIds.size()) throw new BadRequestException("A room cannot appear more than once");

        TreeSet<Long> sortedLocks = new TreeSet<>();
        booking.getDetails().forEach(detail -> sortedLocks.add(detail.getRoom().getId()));
        sortedLocks.addAll(requestedIds);
        List<Long> lockIds = List.copyOf(sortedLocks);
        List<Room> lockedRooms = roomRepository.findAllByIdForUpdate(lockIds);
        if (lockedRooms.size() != lockIds.size()) throw new ResourceNotFoundException("One or more selected rooms do not exist");
        Map<Long, Room> byId = new java.util.HashMap<>();
        lockedRooms.forEach(room -> byId.put(room.getId(), room));
        PricingStrategy standardPricing = pricingStrategyFactory.getStrategy("STANDARD");
        List<BookingDetail> replacement = new ArrayList<>();

        for (Long roomId : requestedIds) {
            Room room = byId.get(roomId);
            boolean checkInIsToday = booking.getCheckInDate().isEqual(LocalDate.now());
            if (!room.isOperational() || room.getStatus() == RoomStatus.MAINTENANCE
                    || (checkInIsToday && room.getStatus() != RoomStatus.AVAILABLE))
                throw new ConflictException("Room " + room.getRoomNumber() + " is not available");
            if (bookingRepository.existsOtherRoomBookingOverlap(roomId, bookingId, booking.getCheckInDate(), booking.getCheckOutDate()))
                throw new ConflictException("Room " + room.getRoomNumber() + " is already booked for the selected dates");
            if (roomBlockRepository.existsOverlap(roomId, booking.getCheckInDate(), booking.getCheckOutDate()))
                throw new ConflictException("Room " + room.getRoomNumber() + " is blocked for the selected dates");
            int guests = guestCount(request.guestCounts(), roomId);
            if (guests < 1 || guests > room.getRoomType().getCapacity())
                throw new BadRequestException("Guest count is invalid for room " + room.getRoomNumber());
            replacement.add(new BookingDetail(booking, room,
                    standardPricing.computePrice(room.getRoomType().getBasePrice(), 1), guests));
        }
        validateGuestCountKeys(request.guestCounts(), requestedIds);
        booking.replaceRooms(replacement);
        return BookingResponse.fromEntity(booking);
    }

    @Override
    @Transactional
    public void cancelBooking(Long bookingId) { cancelBooking(bookingId, "SYSTEM", null); }

    @Override
    @Transactional
    public void cancelBooking(Long bookingId, String actor, String reason) {
        Booking booking = bookingRepository.findByIdForUpdate(bookingId)
                .orElseThrow(() -> new ResourceNotFoundException("Booking not found with ID: " + bookingId));
        if (booking.getStatus() == BookingStatus.PENDING_DEPOSIT && !Instant.now().isBefore(booking.getDepositDeadline())) {
            booking.expire(Instant.now());
            return;
        }
        if (booking.getStatus() == BookingStatus.PENDING_VERIFICATION && booking.getVerificationDeadline() != null && !Instant.now().isBefore(booking.getVerificationDeadline())) {
            booking.expire(Instant.now());
            return;
        }
        if (booking.getStatus() != BookingStatus.CONFIRMED && booking.getStatus() != BookingStatus.PENDING && booking.getStatus() != BookingStatus.PENDING_DEPOSIT && booking.getStatus() != BookingStatus.PENDING_VERIFICATION)
            throw new BadRequestException("Only pending or confirmed bookings can be cancelled");
        booking.cancel(actor, reason == null || reason.isBlank() ? null : reason.trim());
    }

    @Override
    @Transactional
    public BookingResponse confirmBooking(Long bookingId) {
        Booking booking = bookingRepository.findByIdForUpdate(bookingId)
                .orElseThrow(() -> new ResourceNotFoundException("Booking not found with ID: " + bookingId));
        if (booking.getStatus() != BookingStatus.PENDING) throw new BadRequestException("Only pending bookings can be confirmed");
        booking.confirm();
        return BookingResponse.fromEntity(booking);
    }

    @Override
    @Transactional
    public BookingResponse rejectBooking(Long bookingId, String reason) {
        Booking booking = bookingRepository.findByIdForUpdate(bookingId)
                .orElseThrow(() -> new ResourceNotFoundException("Booking not found with ID: " + bookingId));
        if (booking.getStatus() != BookingStatus.PENDING) throw new BadRequestException("Only pending bookings can be rejected");
        booking.reject();
        booking.setRejectionReason(reason == null || reason.isBlank() ? null : reason.trim());
        return BookingResponse.fromEntity(booking);
    }
}
