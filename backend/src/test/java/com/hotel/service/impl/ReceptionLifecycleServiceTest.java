package com.hotel.service.impl;

import com.hotel.entity.Booking;
import com.hotel.entity.Customer;
import com.hotel.entity.Invoice;
import com.hotel.entity.InvoiceItem;
import com.hotel.entity.Room;
import com.hotel.entity.RoomType;
import com.hotel.enums.BookingStatus;
import com.hotel.enums.InvoiceItemType;
import com.hotel.enums.RoomStatus;
import com.hotel.exception.BadRequestException;
import com.hotel.repository.BookingRepository;
import com.hotel.repository.InvoiceRepository;
import com.hotel.repository.PaymentRepository;
import com.hotel.repository.RoomRepository;
import com.hotel.repository.ServiceOrderRepository;
import com.hotel.service.ServiceUsageService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertEquals;
import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.verifyNoInteractions;
import static org.mockito.Mockito.when;

@ExtendWith(MockitoExtension.class)
class ReceptionLifecycleServiceTest {
    @Mock BookingRepository bookings;
    @Mock RoomRepository rooms;
    @Mock ServiceUsageService serviceUsageService;
    @Mock InvoiceRepository invoices;
    @Mock PaymentRepository payments;
    @Mock ServiceOrderRepository serviceOrders;

    @Test
    void checkInRejectsBookingThatIsNotConfirmed() {
        Booking booking = booking(BookingStatus.PENDING, RoomStatus.AVAILABLE);
        when(bookings.findByIdForUpdate(2L)).thenReturn(Optional.of(booking));
        ReceptionServiceImpl service = new ReceptionServiceImpl(bookings, rooms, serviceUsageService);

        assertThrows(BadRequestException.class, () -> service.checkIn(2L));
        verifyNoInteractions(rooms);
    }

    @Test
    void checkoutDoesNotCompleteBookingWhileInvoiceHasBalanceDue() {
        Booking booking = booking(BookingStatus.CHECKED_IN, RoomStatus.OCCUPIED);
        when(bookings.findByIdForUpdate(2L)).thenReturn(Optional.of(booking));
        Invoice invoice = new Invoice(booking);
        invoice.addItem(new InvoiceItem(InvoiceItemType.ROOM, "Room 101", BigDecimal.ONE,
                new BigDecimal("100.00"), new BigDecimal("100.00")));
        invoice.setAmounts(new BigDecimal("100.00"), BigDecimal.ZERO, BigDecimal.ZERO,
                BigDecimal.ZERO, BigDecimal.ZERO, new BigDecimal("100.00"));
        invoice.issue();
        when(invoices.findByBookingIdForUpdate(2L)).thenReturn(Optional.of(invoice));
        InvoiceServiceImpl service = new InvoiceServiceImpl(bookings, invoices, payments, rooms, serviceOrders);

        assertThrows(BadRequestException.class, () -> service.completeCheckout(2L));
        verifyNoInteractions(rooms);
        assertEquals(BookingStatus.CHECKED_IN, booking.getStatus());
    }

    private Booking booking(BookingStatus status, RoomStatus roomStatus) {
        Customer customer = new Customer("guest", "encoded", "Guest", "guest@example.test", null, null, null);
        Booking booking = new Booking(customer, LocalDate.now(), LocalDate.now().plusDays(1));
        booking.setId(2L);
        booking.setStatus(status);
        RoomType type = new RoomType("Standard", 100.0, 2, null, null);
        Room room = new Room();
        room.setId(7L);
        room.setRoomNumber("101");
        room.setRoomType(type);
        room.setStatus(roomStatus);
        room.setOperational(true);
        booking.addBookingDetail(room, 100.0);
        return booking;
    }
}
