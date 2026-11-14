package com.hotel.entity;

import com.hotel.enums.InvoiceStatus;
import com.hotel.enums.PaymentMethod;
import com.hotel.enums.PaymentStatus;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.ColumnDefault;

import java.math.BigDecimal;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Getter
@NoArgsConstructor
@Entity
@Table(name = "invoices")
public class Invoice extends BaseEntity {
    @OneToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "booking_id", nullable = false, unique = true)
    private Booking booking;

    @Column(name = "room_amount", nullable = false, precision = 15, scale = 2)
    private BigDecimal roomAmount = BigDecimal.ZERO;

    @Column(name = "service_amount", nullable = false, precision = 15, scale = 2)
    private BigDecimal serviceAmount = BigDecimal.ZERO;

    @Column(nullable = false, precision = 15, scale = 2)
    private BigDecimal tax = BigDecimal.ZERO;

    @Column(nullable = false, precision = 15, scale = 2)
    private BigDecimal surcharge = BigDecimal.ZERO;

    @Column(nullable = false, precision = 15, scale = 2)
    private BigDecimal discount = BigDecimal.ZERO;

    @Column(name = "total_amount", nullable = false, precision = 15, scale = 2)
    private BigDecimal totalAmount = BigDecimal.ZERO;

    @Enumerated(EnumType.STRING)
    @Column(name = "invoice_status", nullable = false, length = 20)
    @ColumnDefault("'DRAFT'")
    private InvoiceStatus status = InvoiceStatus.DRAFT;

    // Kept for compatibility with the previous single-payment invoice representation.
    @Enumerated(EnumType.STRING)
    @Column(name = "payment_method", length = 30)
    private PaymentMethod paymentMethod;

    @Column(name = "is_paid", nullable = false)
    @ColumnDefault("false")
    private boolean isPaid;

    @Column(name = "paid_at")
    private LocalDateTime paidAt;

    @OneToMany(mappedBy = "invoice", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<InvoiceItem> items = new ArrayList<>();

    @OneToMany(mappedBy = "invoice", cascade = CascadeType.ALL)
    private List<Payment> payments = new ArrayList<>();

    public Invoice(Booking booking) {
        this.booking = booking;
        this.status = InvoiceStatus.DRAFT;
    }

    @PostLoad
    private void restoreLegacyPaidStatus() {
        if (isPaid && status == InvoiceStatus.DRAFT) status = InvoiceStatus.PAID;
    }

    public void addItem(InvoiceItem item) {
        item.setInvoice(this);
        this.items.add(item);
    }

    public void setAmounts(BigDecimal roomAmount, BigDecimal serviceAmount, BigDecimal tax,
                           BigDecimal surcharge, BigDecimal discount, BigDecimal totalAmount) {
        requireDraft();
        this.roomAmount = roomAmount;
        this.serviceAmount = serviceAmount;
        this.tax = tax;
        this.surcharge = surcharge;
        this.discount = discount;
        this.totalAmount = totalAmount;
    }

    public void replaceItems(List<InvoiceItem> replacement) {
        requireDraft();
        this.items.clear();
        replacement.forEach(this::addItem);
    }

    public void issue() {
        requireDraft();
        if (items.isEmpty()) throw new IllegalStateException("Cannot issue an invoice without items");
        this.status = InvoiceStatus.ISSUED;
        if (getBalanceDue().signum() == 0) {
            this.status = InvoiceStatus.PAID;
            this.isPaid = true;
            this.paidAt = LocalDateTime.now();
        }
    }

    public void addSuccessfulPayment(Payment payment) {
        if (status != InvoiceStatus.ISSUED) throw new IllegalStateException("Only issued invoices can receive payments");
        payment.setInvoice(this);
        payments.add(payment);
        if (getBalanceDue().signum() == 0) {
            this.status = InvoiceStatus.PAID;
            this.isPaid = true;
            this.paidAt = LocalDateTime.now();
        }
        this.paymentMethod = payment.getMethod();
    }

    public BigDecimal getSuccessfulPayments() {
        if (isPaid && payments.isEmpty() && booking.getDepositPaidAt() == null) return totalAmount;
        BigDecimal balancePayments = payments.stream().filter(p -> p.getStatus() == PaymentStatus.SUCCESSFUL)
                .map(Payment::getAmount).reduce(BigDecimal.ZERO, BigDecimal::add);
        BigDecimal deposit = booking.getDepositPaidAt() == null || booking.getDepositAmount() == null
                ? BigDecimal.ZERO : booking.getDepositAmount();
        return balancePayments.add(deposit);
    }

    public BigDecimal getBalanceDue() {
        return totalAmount.subtract(getSuccessfulPayments()).max(BigDecimal.ZERO);
    }

    public boolean isFinalized() { return status != InvoiceStatus.DRAFT; }

    private void requireDraft() {
        if (status != InvoiceStatus.DRAFT) throw new IllegalStateException("Issued invoice is immutable");
    }
}
