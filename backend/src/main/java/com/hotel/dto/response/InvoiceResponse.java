package com.hotel.dto.response;

import com.hotel.entity.Invoice;
import com.hotel.enums.InvoiceStatus;
import com.hotel.enums.PaymentMethod;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.List;

public record InvoiceResponse(Long id, Long bookingId, String customerName,
                              BigDecimal roomAmount, BigDecimal serviceAmount, BigDecimal tax,
                              BigDecimal surcharge, BigDecimal discount, BigDecimal totalAmount,
                              BigDecimal successfulPayments, BigDecimal balanceDue,
                              BigDecimal depositPaid,
                              InvoiceStatus status, PaymentMethod paymentMethod, boolean isPaid,
                              LocalDateTime paidAt, List<InvoiceItemResponse> items,
                              List<PaymentResponse> payments) {
    public static InvoiceResponse fromEntity(Invoice invoice) {
        return new InvoiceResponse(invoice.getId(), invoice.getBooking().getId(),
                invoice.getBooking().getCustomer().getFullName(), invoice.getRoomAmount(),
                invoice.getServiceAmount(), invoice.getTax(), invoice.getSurcharge(), invoice.getDiscount(),
                invoice.getTotalAmount(), invoice.getSuccessfulPayments(), invoice.getBalanceDue(),
                invoice.getBooking().getDepositPaidAt() == null ? BigDecimal.ZERO : invoice.getBooking().getDepositAmount(),
                invoice.getStatus(), invoice.getPaymentMethod(), invoice.isPaid(), invoice.getPaidAt(),
                invoice.getItems().stream().map(InvoiceItemResponse::from).toList(),
                invoice.getPayments().stream().map(PaymentResponse::from).toList());
    }
}
