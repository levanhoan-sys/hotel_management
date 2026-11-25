package com.hotel.dto.response;

import com.hotel.entity.Payment;
import com.hotel.enums.PaymentMethod;
import com.hotel.enums.PaymentStatus;

import java.math.BigDecimal;
import java.time.LocalDateTime;

public record PaymentResponse(Long id, Long invoiceId, BigDecimal amount, PaymentMethod method,
                              PaymentStatus status, String reference,
                              LocalDateTime paidAt) {
    public static PaymentResponse from(Payment payment) {
        return new PaymentResponse(payment.getId(), payment.getInvoice().getId(), payment.getAmount(),
                payment.getMethod(), payment.getStatus(), payment.getReference(), payment.getPaidAt());
    }
}
