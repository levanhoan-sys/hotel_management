package com.hotel.controller;

import com.hotel.dto.response.ApiResponse;
import com.hotel.dto.response.BookingResponse;
import com.hotel.dto.response.CustomerResponse;
import com.hotel.dto.response.HotelSummaryResponse;
import com.hotel.entity.Booking;
import com.hotel.entity.Invoice;
import com.hotel.entity.Room;
import com.hotel.enums.BookingStatus;
import com.hotel.enums.RoomStatus;
import com.hotel.repository.BookingRepository;
import com.hotel.repository.CustomerRepository;
import com.hotel.repository.InvoiceRepository;
import com.hotel.repository.RoomRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.bind.annotation.GetMapping;
import org.springframework.web.bind.annotation.RequestMapping;
import org.springframework.web.bind.annotation.RestController;

import java.math.BigDecimal;
import java.util.List;

@RestController
@RequiredArgsConstructor
@RequestMapping("/api/reception")
public class ReceptionManagementController {
    private final RoomRepository rooms;
    private final CustomerRepository customers;
    private final BookingRepository bookings;
    private final InvoiceRepository invoices;

    @GetMapping("/customers")
    @Transactional(readOnly = true)
    public ApiResponse<List<CustomerResponse>> customers() {
        return ApiResponse.ok(customers.findAll().stream().map(customer -> {
            var customerBookings = bookings.findByCustomerId(customer.getId());
            var active = customerBookings.stream().filter(b -> b.getStatus() == BookingStatus.CHECKED_IN).findFirst();
            var upcoming = customerBookings.stream().filter(b -> b.getStatus() == BookingStatus.CONFIRMED).findFirst();
            var relevant = active.or(() -> upcoming);
            String status = active.isPresent() ? "Đang lưu trú"
                    : upcoming.isPresent() ? "Có đặt phòng sắp tới"
                    : customerBookings.isEmpty() ? "Chưa có đặt phòng" : "Không lưu trú";
            return CustomerResponse.from(customer, status, relevant.map(Booking::getId).orElse(null));
        }).toList());
    }

    @GetMapping("/bookings")
    @Transactional(readOnly = true)
    public ApiResponse<List<BookingResponse>> bookings() {
        return ApiResponse.ok(bookings.findAllByOrderByCreatedAtDesc().stream()
                .map(BookingResponse::fromEntity)
                .toList());
    }

    @GetMapping("/summary")
    @Transactional(readOnly = true)
    public ApiResponse<HotelSummaryResponse> summary() {
        var allRooms = rooms.findAll();
        long revenue = Math.round(invoices.findAll().stream()
                .filter(Invoice::isPaid)
                .map(Invoice::getTotalAmount)
                .reduce(BigDecimal.ZERO, BigDecimal::add)
                .doubleValue());
        return ApiResponse.ok(new HotelSummaryResponse(
                allRooms.size(),
                count(allRooms, RoomStatus.AVAILABLE),
                count(allRooms, RoomStatus.OCCUPIED),
                count(allRooms, RoomStatus.CLEANING),
                count(allRooms, RoomStatus.MAINTENANCE),
                bookings.countByStatus(BookingStatus.CONFIRMED),
                bookings.countByStatus(BookingStatus.CHECKED_IN),
                customers.count(),
                revenue));
    }

    private long count(List<Room> allRooms, RoomStatus status) {
        return allRooms.stream().filter(room -> room.getStatus() == status).count();
    }
}
