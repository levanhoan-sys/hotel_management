package com.hotel.entity;

import com.hotel.enums.PaymentMethod;
import com.hotel.enums.PaymentStatus;
import com.hotel.enums.PaymentType;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.CreationTimestamp;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@Entity
@Table(name = "payments", indexes = {
        @Index(name = "idx_payments_invoice", columnList = "invoice_id"),
        @Index(name = "idx_payments_booking", columnList = "booking_id")
})
public class Payment extends BaseEntity {
    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "invoice_id")
    private Invoice invoice;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "booking_id")
    private Booking booking;

    @Enumerated(EnumType.STRING)
    @Column(name = "type", nullable = false, length = 20)
    private PaymentType type = PaymentType.BALANCE;

    @Column(nullable = false, precision = 15, scale = 2)
    private BigDecimal amount;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private PaymentMethod method;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 20)
    private PaymentStatus status = PaymentStatus.SUCCESSFUL;

    @Column(name = "idempotency_key", nullable = false, unique = true, length = 120)
    private String idempotencyKey;

    @Column(length = 255)
    private String reference;

    @Column(name = "confirmed_transaction_reference", length = 255)
    private String confirmedTransactionReference;

    @Column(name = "confirmed_by", length = 50)
    private String confirmedBy;

    @Column(name = "reported_at")
    private LocalDateTime reportedAt;

    @Column(name = "paid_at")
    private LocalDateTime paidAt = LocalDateTime.now();

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    public Payment(BigDecimal amount, PaymentMethod method, String idempotencyKey, String reference) {
        this.amount = amount;
        this.method = method;
        this.idempotencyKey = idempotencyKey;
        this.reference = reference;
        this.status = PaymentStatus.SUCCESSFUL;
        this.paidAt = LocalDateTime.now();
    }

    public static Payment pendingDeposit(Booking booking, String idempotencyKey) {
        Payment payment = new Payment();
        payment.booking = booking;
        payment.type = PaymentType.DEPOSIT;
        payment.amount = booking.getDepositAmount();
        payment.method = PaymentMethod.BANK_TRANSFER;
        payment.idempotencyKey = idempotencyKey;
        payment.status = PaymentStatus.PENDING;
        payment.paidAt = null;
        return payment;
    }

    public void markSuccessful(String providerReference) {
        if (status != PaymentStatus.PENDING && status != PaymentStatus.REPORTED) {
            throw new IllegalStateException("Payment is not awaiting confirmation");
        }
        this.status = PaymentStatus.SUCCESSFUL;
        this.reference = providerReference;
        this.paidAt = LocalDateTime.now();
    }

    public void markReported(LocalDateTime at) {
        if (status != PaymentStatus.PENDING) {
            throw new IllegalStateException("Payment is not pending");
        }
        status = PaymentStatus.REPORTED;
        reportedAt = at;
    }
}
