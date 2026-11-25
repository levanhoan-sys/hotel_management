package com.hotel.enums;

public enum BookingStatus {
    PENDING_DEPOSIT,
    PENDING_VERIFICATION,
    PENDING,
    CONFIRMED,
    REJECTED,
    CHECKED_IN,
    COMPLETED,
    /** Legacy value retained for bookings persisted by the previous checkout flow. */
    @Deprecated
    CHECKED_OUT,
    CANCELLED,
    EXPIRED,
    NO_SHOW
}
