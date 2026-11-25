package com.hotel.dto.response;

public record HotelSummaryResponse(long totalRooms, long availableRooms, long occupiedRooms,
                                   long cleaningRooms, long maintenanceRooms, long confirmedBookings,
                                   long checkedInBookings, long totalCustomers, double revenue) { }
