package com.hotel.service.impl;

import com.hotel.dto.request.BookingRequest;
import com.hotel.config.HotelBookingProperties;
import com.hotel.entity.Customer;
import com.hotel.entity.Room;
import com.hotel.entity.RoomType;
import com.hotel.enums.RoomStatus;
import com.hotel.exception.BadRequestException;
import com.hotel.exception.ConflictException;
import com.hotel.repository.BookingRepository;
import com.hotel.repository.CustomerRepository;
import com.hotel.repository.RoomBlockRepository;
import com.hotel.repository.RoomRepository;
import com.hotel.strategy.pricing.PricingStrategyFactory;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.math.BigDecimal;
import java.time.LocalTime;
import java.time.ZoneId;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class BookingServiceImplTest {
    @Mock BookingRepository bookings;
    @Mock CustomerRepository customers;
    @Mock RoomRepository rooms;
    @Mock RoomBlockRepository blocks;
    @Mock PricingStrategyFactory pricing;
    BookingServiceImpl service;
    Customer customer;

    @BeforeEach void setUp() {
        service = new BookingServiceImpl(bookings, customers, rooms, blocks, pricing,
                new HotelBookingProperties(new BigDecimal("0.30"), 15, LocalTime.of(14, 0), ZoneId.of("Asia/Ho_Chi_Minh"), 72, 24));
        customer = new Customer("guest", "encoded", "Guest", "guest@example.com", null, null, null);
        customer.setId(4L);
        when(customers.findById(4L)).thenReturn(Optional.of(customer));
    }

    @Test void rejectsCheckoutThatIsNotAfterCheckin() {
        BookingRequest request = request(LocalDate.now().plusDays(2), LocalDate.now().plusDays(2), List.of(11L));
        assertThrows(BadRequestException.class, () -> service.createBooking(request));
        verifyNoInteractions(rooms, blocks, bookings);
    }

    @Test void rejectsDuplicateRoomsBeforeLocking() {
        BookingRequest request = request(LocalDate.now().plusDays(2), LocalDate.now().plusDays(3), List.of(11L, 11L));
        assertThrows(BadRequestException.class, () -> service.createBooking(request));
        verifyNoInteractions(rooms, blocks, bookings);
    }

    @Test void failsWholeBookingWhenAnySelectedRoomIsUnavailable() {
        BookingRequest request = request(LocalDate.now().plusDays(2), LocalDate.now().plusDays(3), List.of(11L, 12L));
        Room available = room(11L, RoomStatus.AVAILABLE, 2);
        Room unavailable = room(12L, RoomStatus.MAINTENANCE, 2);
        when(rooms.findAllByIdForUpdate(List.of(11L, 12L))).thenReturn(List.of(available, unavailable));
        when(bookings.existsRoomBookingOverlap(any(), any(), any())).thenReturn(false);
        when(blocks.existsOverlap(any(), any(), any())).thenReturn(false);

        assertThrows(ConflictException.class, () -> service.createBooking(request));
        verify(bookings, never()).save(any());
    }

    private BookingRequest request(LocalDate checkIn, LocalDate checkOut, List<Long> roomIds) {
        BookingRequest request = new BookingRequest();
        request.setCustomerId(4L);
        request.setCheckInDate(checkIn);
        request.setCheckOutDate(checkOut);
        request.setRoomIds(roomIds);
        return request;
    }

    private Room room(Long id, RoomStatus status, int capacity) {
        RoomType type = new RoomType("Standard", 100.0, capacity, null, null);
        Room room = new Room();
        room.setRoomNumber("R" + id);
        room.setFloor(1);
        room.setStatus(status);
        room.setRoomType(type);
        room.setId(id);
        room.setOperational(true);
        return room;
    }
}
