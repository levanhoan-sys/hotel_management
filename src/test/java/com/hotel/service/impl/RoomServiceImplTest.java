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

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Collections;

import static org.junit.jupiter.api.Assertions.assertDoesNotThrow;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

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

    @Test void rejectsNegativeMinPrice() {
        assertThrows(BadRequestException.class,
                () -> service.searchRooms(null, null, null, null, new BigDecimal("-10.00"), null));
        verifyNoInteractions(roomRepository);
    }

    @Test void rejectsMinPriceGreaterThanMaxPrice() {
        assertThrows(BadRequestException.class,
                () -> service.searchRooms(null, null, null, null, new BigDecimal("200.00"), new BigDecimal("100.00")));
        verifyNoInteractions(roomRepository);
    }

    @Test void allowsValidBigDecimalPriceRange() {
        when(roomRepository.searchRooms(null, null, null, null, new BigDecimal("50.00"), new BigDecimal("150.00")))
                .thenReturn(Collections.emptyList());
        assertDoesNotThrow(
                () -> service.searchRooms(null, null, null, null, new BigDecimal("50.00"), new BigDecimal("150.00")));
    }
}
