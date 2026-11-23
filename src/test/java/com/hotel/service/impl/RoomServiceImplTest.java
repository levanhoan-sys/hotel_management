package com.hotel.service.impl;

import com.hotel.exception.BadRequestException;
import com.hotel.repository.BookingRepository;
import com.hotel.repository.RoomBlockRepository;
import com.hotel.repository.RoomRepository;
import com.hotel.repository.RoomTypeRepository;
import com.hotel.repository.ServiceItemRepository;
import com.hotel.service.RoomTypeService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.verifyNoInteractions;

@ExtendWith(MockitoExtension.class)
class RoomServiceImplTest {
    @Mock RoomRepository roomRepository;
    @Mock RoomTypeRepository roomTypeRepository;
    @Mock RoomBlockRepository roomBlockRepository;
    @Mock BookingRepository bookingRepository;
    @Mock ServiceItemRepository serviceItems;
    @Mock RoomTypeService roomTypeService;
    RoomServiceImpl service;

    @BeforeEach void setUp() {
        service = new RoomServiceImpl(roomRepository, roomTypeRepository, roomBlockRepository, bookingRepository, serviceItems, roomTypeService);
    }

    @Test void rejectsDateRangeWhenCheckoutIsNotAfterCheckin() {
        LocalDate checkIn = LocalDate.of(2026, 12, 10);
        assertThrows(BadRequestException.class,
                () -> service.searchRooms(checkIn, checkIn, null, null, null, null));
        verifyNoInteractions(roomRepository);
    }

    @Test void requiresBothSearchDatesTogether() {
        assertThrows(BadRequestException.class,
                () -> service.searchRooms(LocalDate.of(2026, 12, 10), null, null, null, null, null));
        verifyNoInteractions(roomRepository);
    }
}
