package com.hotel.service.impl;

import com.hotel.entity.Room;
import com.hotel.entity.RoomType;
import com.hotel.enums.RoomStatus;
import com.hotel.repository.RoomRepository;
import com.hotel.repository.RoomTypeRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.util.List;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class RoomRecommendationServiceTest {
    @Mock RoomRepository rooms;
    @Mock RoomTypeRepository roomTypes;

    @Test
    void groupsByRoomTypeAndRequiresRequestedQuantity() {
        RoomType wanted = type(1L, "Standard", 900_000, 2, "WiFi, TV");
        RoomType tooFew = type(2L, "Deluxe", 1_100_000, 3, "WiFi, TV");
        RoomType enough = type(3L, "Twin", 850_000, 2, "WiFi");
        when(rooms.findById(99L)).thenReturn(Optional.of(room(99L, wanted, "099")));
        when(rooms.searchRooms(null, null, null, 2, null, null)).thenReturn(List.of(
                room(1L, wanted, "101"),
                room(2L, tooFew, "201"),
                room(3L, enough, "301"),
                room(4L, enough, "302"),
                room(5L, enough, "303")
        ));

        var result = new RoomRecommendationService(rooms, roomTypes).recommend(99L, null, null, null, 2, 3, true, 4);

        assertEquals(1, result.size());
        assertEquals("Twin", result.getFirst().getRoom().getRoomTypeName());
        assertNull(result.getFirst().getAvailableQuantity());
        assertFalse(result.getFirst().isAvailabilityChecked());
        assertTrue(result.getFirst().getScore() >= 0 && result.getFirst().getScore() <= 100);
    }

    private RoomType type(Long id, String name, double price, int capacity, String amenities) {
        RoomType type = new RoomType(name, price, capacity, name, null, null, amenities);
        type.setId(id);
        return type;
    }

    private Room room(Long id, RoomType type, String number) {
        Room room = new Room();
        room.setId(id);
        room.setRoomType(type);
        room.setRoomNumber(number);
        room.setStatus(RoomStatus.AVAILABLE);
        room.setOperational(true);
        return room;
    }
}
