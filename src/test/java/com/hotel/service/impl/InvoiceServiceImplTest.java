package com.hotel.service.impl;

import com.hotel.dto.request.PaymentRequest;
import com.hotel.entity.Booking;
import com.hotel.entity.BookingDetail;
import com.hotel.entity.Customer;
import com.hotel.entity.Invoice;
import com.hotel.entity.InvoiceItem;
import com.hotel.entity.Payment;
import com.hotel.entity.Room;
import com.hotel.entity.RoomType;
import com.hotel.entity.ServiceItem;
import com.hotel.enums.InvoiceItemType;
import com.hotel.enums.PaymentMethod;
import com.hotel.enums.BookingStatus;
import com.hotel.enums.RoomStatus;
import com.hotel.exception.ConflictException;
import com.hotel.exception.BadRequestException;
import com.hotel.repository.BookingRepository;
import com.hotel.repository.InvoiceRepository;
import com.hotel.repository.PaymentRepository;
import com.hotel.repository.RoomRepository;
import com.hotel.repository.ServiceOrderRepository;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.math.BigDecimal;
import java.time.LocalDate;
import java.util.Optional;
import java.util.List;

import static org.junit.jupiter.api.Assertions.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class InvoiceServiceImplTest {
    @Mock BookingRepository bookings;
    @Mock InvoiceRepository invoices;
    @Mock PaymentRepository payments;
    @Mock RoomRepository rooms;
    @Mock ServiceOrderRepository serviceOrders;

    @Test void paymentCannotExceedInvoiceBalance() {
        Invoice invoice = issuedInvoice();
        when(invoices.findByIdForUpdate(8L)).thenReturn(Optional.of(invoice));
        when(payments.findByIdempotencyKey("attempt-1")).thenReturn(Optional.empty());
        InvoiceServiceImpl service = new InvoiceServiceImpl(bookings, invoices, payments, rooms, serviceOrders);

        assertThrows(BadRequestException.class, () -> service.recordPayment(8L,
                new PaymentRequest(new BigDecimal("100.01"), PaymentMethod.CASH, "attempt-1", null)));
        verify(payments, never()).save(any());
    }

    @Test void repeatedIdempotencyKeyReturnsOriginalPayment() {
        Invoice invoice = issuedInvoice();
        Payment original = new Payment(new BigDecimal("25.00"), PaymentMethod.BANK_TRANSFER, "retry-key", "bank-ref");
        original.setInvoice(invoice);
        when(invoices.findByIdForUpdate(8L)).thenReturn(Optional.of(invoice));
        when(payments.findByIdempotencyKey("retry-key")).thenReturn(Optional.of(original));
        InvoiceServiceImpl service = new InvoiceServiceImpl(bookings, invoices, payments, rooms, serviceOrders);

        var response = service.recordPayment(8L,
                new PaymentRequest(new BigDecimal("25.00"), PaymentMethod.BANK_TRANSFER, "retry-key", "bank-ref"));

        assertEquals(new BigDecimal("25.00"), response.amount());
        verify(payments, never()).save(any());
    }

    @Test void draftUsesDecimalArithmeticAndSnapshotsRoomAndServiceLines() {
        Customer customer = new Customer("guest", "encoded", "Guest", "guest@example.test", null, null, null);
        Booking booking = new Booking(customer, LocalDate.now(), LocalDate.now().plusDays(2));
        booking.setId(12L);
        booking.setStatus(BookingStatus.CHECKED_IN);
        RoomType type = new RoomType("Standard", 120.50, 2, null, null);
        Room room = new Room();
        room.setId(4L); room.setRoomNumber("104"); room.setRoomType(type); room.setStatus(RoomStatus.OCCUPIED);
        BookingDetail detail = new BookingDetail(booking, room, 120.50, 2);
        booking.getDetails().add(detail);
        booking.getServiceOrders().add(new com.hotel.entity.ServiceOrder(booking, detail,
                new ServiceItem("Breakfast", 3.25, "meal", true), 2));
        when(bookings.findByIdForUpdate(12L)).thenReturn(Optional.of(booking));
        when(invoices.findByBookingIdForUpdate(12L)).thenReturn(Optional.empty());
        when(invoices.save(any(Invoice.class))).thenAnswer(invocation -> invocation.getArgument(0));
        InvoiceServiceImpl service = new InvoiceServiceImpl(bookings, invoices, payments, rooms, serviceOrders);

        var result = service.createOrUpdateDraft(12L,
                new com.hotel.dto.request.InvoiceDraftRequest(new BigDecimal("2.00"), new BigDecimal("1.00")));

        assertEquals(new BigDecimal("241.00"), result.roomAmount());
        assertEquals(new BigDecimal("6.50"), result.serviceAmount());
        assertEquals(new BigDecimal("24.75"), result.tax());
        assertEquals(new BigDecimal("273.25"), result.totalAmount());
        assertEquals(5, result.items().size());
    }

    private Invoice issuedInvoice() {
        Booking booking = new Booking(new Customer("guest", "encoded", "Guest", "guest@example.test", null, null, null),
                LocalDate.now(), LocalDate.now().plusDays(1));
        Invoice invoice = new Invoice(booking);
        invoice.setId(8L);
        invoice.addItem(new InvoiceItem(InvoiceItemType.ROOM, "Room 101", BigDecimal.ONE,
                new BigDecimal("100.00"), new BigDecimal("100.00")));
        invoice.setAmounts(new BigDecimal("100.00"), BigDecimal.ZERO, BigDecimal.ZERO,
                BigDecimal.ZERO, BigDecimal.ZERO, new BigDecimal("100.00"));
        invoice.issue();
        return invoice;
    }
}
