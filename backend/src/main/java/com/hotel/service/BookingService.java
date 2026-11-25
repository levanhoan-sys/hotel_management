package com.hotel.service;

import com.hotel.dto.request.BookingRequest;
import com.hotel.dto.request.ChangeBookingRoomsRequest;
import com.hotel.dto.response.BookingResponse;
import org.springframework.data.domain.Page;
import org.springframework.data.domain.Pageable;

import java.util.List;

public interface BookingService {
    BookingResponse createBooking(BookingRequest request);
    BookingResponse createDepositBooking(BookingRequest request);
    BookingResponse getBookingById(Long id);
    List<BookingResponse> getBookingsByCustomerId(Long customerId);
    void cancelBooking(Long bookingId);
    void cancelBooking(Long bookingId, String actor, String reason);
    BookingResponse confirmBooking(Long bookingId);
    BookingResponse rejectBooking(Long bookingId, String reason);
    Page<BookingResponse> getAllBookings(Pageable pageable);
    Page<BookingResponse> getBookingsByCustomerId(Long customerId, Pageable pageable);
    BookingResponse changeRooms(Long bookingId, ChangeBookingRoomsRequest request);
}
