package com.hotel.entity;

import com.hotel.enums.RoomStatus;
import org.junit.jupiter.api.Test;

import static org.junit.jupiter.api.Assertions.*;

class RoomStateTransitionTest {

    @Test
    void testInitialStatusIsAvailable() {
        Room room = new Room();
        assertEquals(RoomStatus.AVAILABLE, room.getStatus());
        assertTrue(room.isAvailable());
    }

    @Test
    void testAllowedTransitionsFromAvailable() {
        Room room = new Room();
        room.changeStatus(RoomStatus.OCCUPIED);
        assertEquals(RoomStatus.OCCUPIED, room.getStatus());

        room = new Room();
        room.changeStatus(RoomStatus.MAINTENANCE);
        assertEquals(RoomStatus.MAINTENANCE, room.getStatus());

        room = new Room();
        room.changeStatus(RoomStatus.CLEANING);
        assertEquals(RoomStatus.CLEANING, room.getStatus());

        room = new Room();
        room.changeStatus(RoomStatus.BOOKED);
        assertEquals(RoomStatus.BOOKED, room.getStatus());
    }

    @Test
    void testAllowedTransitionsFromOccupied() {
        Room room = new Room();
        room.changeStatus(RoomStatus.OCCUPIED);

        // OCCUPIED -> CLEANING is allowed
        room.changeStatus(RoomStatus.CLEANING);
        assertEquals(RoomStatus.CLEANING, room.getStatus());

        // OCCUPIED -> AVAILABLE directly is NOT allowed
        Room room2 = new Room();
        room2.changeStatus(RoomStatus.OCCUPIED);
        assertThrows(IllegalStateException.class, () -> room2.changeStatus(RoomStatus.AVAILABLE));
    }

    @Test
    void testAllowedTransitionsFromCleaning() {
        Room room = new Room();
        room.changeStatus(RoomStatus.CLEANING);

        // CLEANING -> AVAILABLE is allowed
        room.changeStatus(RoomStatus.AVAILABLE);
        assertEquals(RoomStatus.AVAILABLE, room.getStatus());
    }

    @Test
    void testAllowedTransitionsFromMaintenance() {
        Room room = new Room();
        room.changeStatus(RoomStatus.MAINTENANCE);

        // MAINTENANCE -> AVAILABLE is allowed
        room.changeStatus(RoomStatus.AVAILABLE);
        assertEquals(RoomStatus.AVAILABLE, room.getStatus());
    }

    @Test
    void testSameStatusTransitionDoesNothing() {
        Room room = new Room();
        room.changeStatus(RoomStatus.AVAILABLE);
        assertEquals(RoomStatus.AVAILABLE, room.getStatus());
    }

    @Test
    void testNullStatusThrowsIllegalArgumentException() {
        Room room = new Room();
        assertThrows(IllegalArgumentException.class, () -> room.changeStatus(null));
    }
}
