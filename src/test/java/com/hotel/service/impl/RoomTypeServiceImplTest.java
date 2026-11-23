package com.hotel.service.impl;

import com.hotel.dto.request.RoomTypeRequest;
import com.hotel.dto.response.RoomTypeResponse;
import com.hotel.entity.RoomType;
import com.hotel.exception.ConflictException;
import com.hotel.exception.ResourceNotFoundException;
import com.hotel.repository.RoomTypeRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class RoomTypeServiceImplTest {

    @Mock
    private RoomTypeRepository roomTypeRepository;

    private RoomTypeServiceImpl roomTypeService;

    @BeforeEach
    void setUp() {
        roomTypeService = new RoomTypeServiceImpl(roomTypeRepository);
    }

    @Test
    void getRoomTypesReturnsMappedList() {
        RoomType type = new RoomType("Deluxe", new BigDecimal("1500000.00"), 2, "Nice room", null);
        type.setId(1L);
        when(roomTypeRepository.findAll()).thenReturn(List.of(type));

        List<RoomTypeResponse> result = roomTypeService.getRoomTypes();

        assertEquals(1, result.size());
        assertEquals("Deluxe", result.getFirst().name());
        assertEquals(new BigDecimal("1500000.00"), result.getFirst().basePrice());
    }

    @Test
    void createRoomTypeFailsWhenNameExists() {
        RoomTypeRequest request = new RoomTypeRequest("Deluxe", new BigDecimal("1500000.00"), 2, null, null, null, null);
        when(roomTypeRepository.findByName("Deluxe")).thenReturn(Optional.of(new RoomType()));

        assertThrows(ConflictException.class, () -> roomTypeService.createRoomType(request));
        verify(roomTypeRepository, never()).save(any());
    }

    @Test
    void createRoomTypeSucceeds() {
        RoomTypeRequest request = new RoomTypeRequest("Standard", new BigDecimal("800000.00"), 2, "Cozy", null, null, null);
        when(roomTypeRepository.findByName("Standard")).thenReturn(Optional.empty());
        when(roomTypeRepository.save(any(RoomType.class))).thenAnswer(inv -> {
            RoomType rt = inv.getArgument(0);
            rt.setId(10L);
            return rt;
        });

        RoomTypeResponse response = roomTypeService.createRoomType(request);

        assertNotNull(response);
        assertEquals("Standard", response.name());
        assertEquals(new BigDecimal("800000.00"), response.basePrice());
    }

    @Test
    void updateRoomTypeThrowsNotFoundWhenIdDoesNotExist() {
        RoomTypeRequest request = new RoomTypeRequest("Suite", new BigDecimal("2500000.00"), 4, null, null, null, null);
        when(roomTypeRepository.findById(99L)).thenReturn(Optional.empty());

        assertThrows(ResourceNotFoundException.class, () -> roomTypeService.updateRoomType(99L, request));
    }
}
