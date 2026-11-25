package com.hotel.enums;

public enum RoomStatus {
    AVAILABLE,
    /** Legacy database value. New reservations are represented by booking records, not room state. */
    @Deprecated
    BOOKED,
    OCCUPIED,
    CLEANING,
    MAINTENANCE
}
