package com.hotel.service;

import com.hotel.dto.request.AddServiceOrderRequest;
import com.hotel.dto.response.BookingResponse;

public interface ReceptionService {
    BookingResponse checkIn(Long bookingId);
    BookingResponse addServiceToBooking(Long bookingId, AddServiceOrderRequest request);
    void completeRoomCleaning(Long roomId);
}
