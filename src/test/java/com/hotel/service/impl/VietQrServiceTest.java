package com.hotel.service.impl;

import com.hotel.config.VietQrProperties;
import com.hotel.entity.Booking;
import com.hotel.entity.Customer;
import com.hotel.enums.BookingStatus;
import com.hotel.repository.BookingRepository;
import org.junit.jupiter.api.Test;

import java.math.BigDecimal;
import java.time.Instant;
import java.util.Optional;

import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;

class VietQrServiceTest {
    @Test
    void buildsQuickLinkFromSavedBookingAmountAndReference() {
        BookingRepository bookings = mock(BookingRepository.class);
        Booking booking = mock(Booking.class);
        Customer customer = mock(Customer.class);
        when(bookings.findById(9L)).thenReturn(Optional.of(booking));
        when(booking.getCustomer()).thenReturn(customer);
        when(customer.getUsername()).thenReturn("mai");
        when(booking.getStatus()).thenReturn(BookingStatus.PENDING_DEPOSIT);
        when(booking.getDepositDeadline()).thenReturn(Instant.now().plusSeconds(60));
        when(booking.getDepositAmount()).thenReturn(new BigDecimal("900000"));
        when(booking.getTransferContent()).thenReturn("COC BK001");
        when(booking.getId()).thenReturn(9L);
        when(booking.getBookingCode()).thenReturn("BK001");

        VietQrService service = new VietQrService(bookings, new VietQrProperties("970415", "0123456789", "HOTEL TEST"));
        var result = service.generate(9L, "mai", false);

        assertThat(result.amount()).isEqualByComparingTo("900000");
        assertThat(result.transferContent()).isEqualTo("COC BK001");
        assertThat(result.qrUrl()).contains("970415-0123456789-compact2.png", "amount=900000", "addInfo=COC%20BK001", "accountName=HOTEL%20TEST");
    }

    @Test
    void doesNotAllowCustomerToUseAnotherCustomersBookingQr() {
        BookingRepository bookings = mock(BookingRepository.class);
        Booking booking = mock(Booking.class);
        Customer customer = mock(Customer.class);
        when(bookings.findById(9L)).thenReturn(Optional.of(booking));
        when(booking.getCustomer()).thenReturn(customer);
        when(customer.getUsername()).thenReturn("owner");

        org.assertj.core.api.Assertions.assertThatThrownBy(() -> new VietQrService(bookings,
                new VietQrProperties("970415", "0123456789", "HOTEL TEST")).generate(9L, "other", false))
                .isInstanceOf(org.springframework.web.server.ResponseStatusException.class);
    }
}
