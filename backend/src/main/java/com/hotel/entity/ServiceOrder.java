package com.hotel.entity;

import com.hotel.enums.ServiceOrderStatus;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;
import org.hibernate.annotations.ColumnDefault;

import java.math.BigDecimal;
import java.time.LocalDateTime;

@Getter
@Setter
@NoArgsConstructor
@Entity
@Table(name = "service_orders", indexes = {
        @Index(name = "idx_service_orders_booking_status", columnList = "booking_id, approval_status, cancelled")
})
public class ServiceOrder extends BaseEntity {

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "booking_id", nullable = false)
    private Booking booking;

    @ManyToOne(fetch = FetchType.LAZY)
    @JoinColumn(name = "booking_detail_id")
    private BookingDetail bookingDetail;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "service_item_id", nullable = false)
    private ServiceItem serviceItem;

    @Column(nullable = false)
    private int quantity;

    @ColumnDefault("0.00")
    @Column(name = "unit_price", nullable = false, precision = 15, scale = 2)
    private BigDecimal unitPrice = BigDecimal.ZERO;

    @Enumerated(EnumType.STRING)
    @Column(name = "approval_status", nullable = false, length = 20)
    @ColumnDefault("'PENDING'")
    private ServiceOrderStatus approvalStatus = ServiceOrderStatus.PENDING;

    @ColumnDefault("false")
    @Column(name = "cancelled", nullable = false)
    private boolean cancelled = false;

    @Column(name = "ordered_at", nullable = false)
    private LocalDateTime orderedAt = LocalDateTime.now();

    @Column(name = "cancelled_at")
    private LocalDateTime cancelledAt;

    @Column(name = "cancellation_reason", length = 500)
    private String cancellationReason;

    public ServiceOrder(Booking booking, ServiceItem serviceItem, int quantity) {
        this(booking, null, serviceItem, quantity);
    }

    public ServiceOrder(Booking booking, BookingDetail bookingDetail, ServiceItem serviceItem, int quantity) {
        this(booking, bookingDetail, serviceItem, quantity, ServiceOrderStatus.APPROVED);
    }

    public ServiceOrder(Booking booking, BookingDetail bookingDetail, ServiceItem serviceItem, int quantity,
                        ServiceOrderStatus approvalStatus) {
        this.booking = booking;
        this.bookingDetail = bookingDetail;
        this.serviceItem = serviceItem;
        this.quantity = quantity;
        this.unitPrice = BigDecimal.valueOf(serviceItem.getUnitPrice());
        this.orderedAt = LocalDateTime.now();
        this.approvalStatus = approvalStatus;
    }

    public double getUnitPrice() {
        return unitPrice == null ? 0.0 : unitPrice.doubleValue();
    }

    public void setUnitPrice(double unitPrice) {
        this.unitPrice = BigDecimal.valueOf(unitPrice);
    }

    @Transient
    public double getSubTotal() {
        return getUnitPrice() * quantity;
    }

    public void approve() {
        if (approvalStatus != ServiceOrderStatus.PENDING) {
            throw new IllegalStateException("Only pending service requests can be approved");
        }
        approvalStatus = ServiceOrderStatus.APPROVED;
    }

    public void reject() {
        if (approvalStatus != ServiceOrderStatus.PENDING) {
            throw new IllegalStateException("Only pending service requests can be rejected");
        }
        approvalStatus = ServiceOrderStatus.REJECTED;
    }

    public void cancel(String reason) {
        if (cancelled) {
            throw new IllegalStateException("Service usage is already cancelled");
        }
        this.cancelled = true;
        this.cancelledAt = LocalDateTime.now();
        this.cancellationReason = reason;
    }
}
