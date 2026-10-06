package com.nhom7.hotel.enums;

public enum RoomStatus {
    AVAILABLE,
    BOOKED,
    OCCUPIED,
    CLEANING,
    MAINTENANCE;

    public boolean canTransitionTo(RoomStatus target) {
        return switch (this) {
            case AVAILABLE -> target == BOOKED || target == OCCUPIED || target == MAINTENANCE;
            case BOOKED -> target == AVAILABLE || target == OCCUPIED;
            case OCCUPIED -> target == CLEANING;
            case CLEANING -> target == AVAILABLE;
            case MAINTENANCE -> target == AVAILABLE;
        };
    }
}
