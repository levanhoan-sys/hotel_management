package com.hotel.enums;

import java.util.EnumSet;
import java.util.Map;
import java.util.Set;

public enum RoomStatus {
    AVAILABLE,
    /** Legacy database value. New reservations are represented by booking records, not room state. */
    @Deprecated
    BOOKED,
    OCCUPIED,
    CLEANING,
    MAINTENANCE;

    private static final Map<RoomStatus, Set<RoomStatus>> ALLOWED_TRANSITIONS = Map.of(
            AVAILABLE, EnumSet.of(OCCUPIED, MAINTENANCE, CLEANING, BOOKED),
            OCCUPIED, EnumSet.of(CLEANING, MAINTENANCE),
            CLEANING, EnumSet.of(AVAILABLE, MAINTENANCE),
            MAINTENANCE, EnumSet.of(AVAILABLE, CLEANING),
            BOOKED, EnumSet.of(AVAILABLE, OCCUPIED, MAINTENANCE, CLEANING)
    );

    public boolean canTransitionTo(RoomStatus target) {
        if (target == null) return false;
        if (this == target) return true;
        Set<RoomStatus> allowed = ALLOWED_TRANSITIONS.get(this);
        return allowed != null && allowed.contains(target);
    }
}
