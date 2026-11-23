package com.hotel.dto.response;

import java.math.BigDecimal;

public record HotelSummaryResponse(long totalRooms, long availableRooms, long occupiedRooms,
                                   long cleaningRooms, long maintenanceRooms, long confirmedBookings,
                                   long checkedInBookings, long totalCustomers, BigDecimal revenue) { }
