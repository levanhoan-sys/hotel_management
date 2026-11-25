package com.hotel.service.impl;

import com.hotel.dto.request.BookingRequest;
import com.hotel.entity.Customer;
import com.hotel.entity.Room;
import com.hotel.entity.RoomType;
import com.hotel.enums.RoomStatus;
import com.hotel.exception.ConflictException;
import com.hotel.repository.BookingRepository;
import com.hotel.repository.CustomerRepository;
import com.hotel.repository.RoomBlockRepository;
import com.hotel.repository.RoomRepository;
import com.hotel.repository.RoomTypeRepository;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;

import java.time.LocalDate;
import java.util.List;
import java.util.concurrent.CountDownLatch;
import java.util.concurrent.ExecutorService;
import java.util.concurrent.Executors;
import java.util.concurrent.Future;
import java.util.concurrent.TimeUnit;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertTrue;

@SpringBootTest(webEnvironment = SpringBootTest.WebEnvironment.MOCK)
@ActiveProfiles("test")
class ConcurrentBookingIntegrationTest {
    @Autowired BookingServiceImpl service;
    @Autowired BookingRepository bookings;
    @Autowired CustomerRepository customers;
    @Autowired RoomRepository rooms;
    @Autowired RoomTypeRepository roomTypes;
    @Autowired RoomBlockRepository blocks;
    @Autowired PasswordEncoder passwords;

    private Long roomId;
    private Long customerId;

    @BeforeEach
    void prepareData() {
        bookings.deleteAll();
        blocks.deleteAll();
        rooms.deleteAll();
        customers.deleteAll();
        roomTypes.deleteAll();
        RoomType type = roomTypes.save(new RoomType("Concurrency Standard", 100.0, 2, null, null));
        Room room = new Room();
        room.setRoomNumber("C-101");
        room.setFloor(1);
        room.setRoomType(type);
        room.setStatus(RoomStatus.AVAILABLE);
        room.setOperational(true);
        roomId = rooms.save(room).getId();
        Customer customer = new Customer("concurrency-customer", passwords.encode("strong-password"),
                "Concurrency Customer", "concurrency@example.test", null, null, null);
        customerId = customers.save(customer).getId();
    }

    @Test
    void concurrentRequestsForSameRoomHaveExactlyOneWinner() throws Exception {
        ExecutorService executor = Executors.newFixedThreadPool(2);
        CountDownLatch ready = new CountDownLatch(2);
        CountDownLatch start = new CountDownLatch(1);
        try {
            Future<Boolean> first = executor.submit(() -> attemptBooking(ready, start));
            Future<Boolean> second = executor.submit(() -> attemptBooking(ready, start));
            assertTrue(ready.await(5, TimeUnit.SECONDS));
            start.countDown();
            int accepted = (first.get(15, TimeUnit.SECONDS) ? 1 : 0) + (second.get(15, TimeUnit.SECONDS) ? 1 : 0);
            assertEquals(1, accepted);
            assertEquals(1, bookings.count());
        } finally {
            executor.shutdownNow();
        }
    }

    @Test
    void checkoutAndNextCheckinOnSameDateAreAllowed() {
        BookingRequest first = request(LocalDate.now().plusDays(5), LocalDate.now().plusDays(7));
        BookingRequest next = request(LocalDate.now().plusDays(7), LocalDate.now().plusDays(8));
        service.createBooking(first);
        service.createBooking(next);
        assertEquals(2, bookings.count());
    }

    private boolean attemptBooking(CountDownLatch ready, CountDownLatch start) throws Exception {
        ready.countDown();
        start.await();
        BookingRequest request = request(LocalDate.now().plusDays(5), LocalDate.now().plusDays(7));
        try {
            service.createBooking(request);
            return true;
        } catch (ConflictException conflict) {
            return false;
        }
    }

    private BookingRequest request(LocalDate checkIn, LocalDate checkOut) {
        BookingRequest request = new BookingRequest();
        request.setCustomerId(customerId);
        request.setCheckInDate(checkIn);
        request.setCheckOutDate(checkOut);
        request.setRoomIds(List.of(roomId));
        return request;
    }
}
