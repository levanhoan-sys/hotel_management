package com.hotel.service.impl;

import com.hotel.dto.request.CreateServiceUsageRequest;
import com.hotel.entity.Booking;
import com.hotel.entity.Customer;
import com.hotel.entity.Invoice;
import com.hotel.enums.BookingStatus;
import com.hotel.exception.BadRequestException;
import com.hotel.exception.ConflictException;
import com.hotel.repository.BookingRepository;
import com.hotel.repository.InvoiceRepository;
import com.hotel.repository.ServiceItemRepository;
import com.hotel.repository.ServiceOrderRepository;
import com.hotel.service.InvoiceService;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;

import java.time.LocalDate;
import java.util.Optional;

import static org.junit.jupiter.api.Assertions.assertThrows;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
class ServiceUsageServiceImplTest {
    @Mock ServiceItemRepository serviceItems;
    @Mock ServiceOrderRepository usages;
    @Mock BookingRepository bookings;
    @Mock InvoiceRepository invoices;
    @Mock InvoiceService invoiceService;

    @Test
    void usageCannotBeAddedBeforeCheckIn() {
        Booking booking = new Booking(new Customer("guest", "encoded", "Guest", "guest@example.test", null, null, null),
                LocalDate.now(), LocalDate.now().plusDays(1));
        booking.setStatus(BookingStatus.CONFIRMED);
        when(bookings.findByIdForUpdate(5L)).thenReturn(Optional.of(booking));
        ServiceUsageServiceImpl service = new ServiceUsageServiceImpl(serviceItems, usages, bookings, invoices, invoiceService);

        assertThrows(BadRequestException.class,
                () -> service.addUsage(5L, new CreateServiceUsageRequest(1L, 2L, 1)));
        verifyNoInteractions(serviceItems, usages, invoices);
    }

    @Test
    void usageCannotBeAddedAfterInvoiceExists() {
        Booking booking = new Booking(new Customer("guest", "encoded", "Guest", "guest@example.test", null, null, null),
                LocalDate.now(), LocalDate.now().plusDays(1));
        booking.setStatus(BookingStatus.CHECKED_IN);
        when(bookings.findByIdForUpdate(5L)).thenReturn(Optional.of(booking));
        Invoice issued = mock(Invoice.class);
        when(issued.isFinalized()).thenReturn(true);
        when(invoices.findByBookingId(5L)).thenReturn(Optional.of(issued));
        ServiceUsageServiceImpl service = new ServiceUsageServiceImpl(serviceItems, usages, bookings, invoices, invoiceService);

        assertThrows(ConflictException.class,
                () -> service.addUsage(5L, new CreateServiceUsageRequest(1L, 2L, 1)));
        verifyNoInteractions(serviceItems, usages);
    }
}
