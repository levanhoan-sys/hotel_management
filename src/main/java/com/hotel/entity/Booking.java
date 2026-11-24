package com.hotel.entity;

import com.hotel.enums.BookingStatus;
import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import lombok.Setter;

import java.time.LocalDate;
import java.time.Instant;
import java.math.BigDecimal;
import java.time.temporal.ChronoUnit;
import java.util.ArrayList;
import java.util.List;
import java.util.UUID;

@Getter
@Setter
@NoArgsConstructor
@Entity
@Table(name = "bookings", indexes = {
        @Index(name = "idx_booking_customer", columnList = "customer_id"),
        @Index(name = "idx_booking_status_dates", columnList = "status, check_in_date, check_out_date")
})
public class Booking extends BaseEntity {

    @Column(name = "booking_code", unique = true, length = 24)
    private String bookingCode;

    @ManyToOne(fetch = FetchType.EAGER)
    @JoinColumn(name = "customer_id", nullable = false)
    private Customer customer;

    @Column(name = "check_in_date", nullable = false)
    private LocalDate checkInDate;

    @Column(name = "check_out_date", nullable = false)
    private LocalDate checkOutDate;

    @Enumerated(EnumType.STRING)
    @Column(nullable = false, length = 30)
    private BookingStatus status = BookingStatus.PENDING;

    @Column(name = "confirmed_at")
    private java.time.LocalDateTime confirmedAt;

    @Column(name = "checked_in_at")
    private java.time.LocalDateTime checkedInAt;

    @Column(name = "checked_out_at")
    private java.time.LocalDateTime checkedOutAt;

    @Column(name = "cancelled_at")
    private java.time.LocalDateTime cancelledAt;

    @Column(name = "cancelled_by", length = 100)
    private String cancelledBy;

    @Column(name = "cancellation_reason", length = 500)
    private String cancellationReason;

    @Column(name = "rejection_reason", length = 500)
    private String rejectionReason;

    @Column(name = "deposit_amount", precision = 15, scale = 2)
    private BigDecimal depositAmount;

    @Column(name = "deposit_rate", precision = 5, scale = 4)
    private BigDecimal depositRate;

    @Column(name = "deposit_deadline")
    private Instant depositDeadline;

    @Column(name = "verification_deadline")
    private Instant verificationDeadline;

    @Column(name = "transfer_content", length = 40)
    private String transferContent;

    @Column(name = "deposit_reported_at")
    private Instant depositReportedAt;

    @Column(name = "deposit_confirmed_by", length = 100)
    private String depositConfirmedBy;

    @Column(name = "deposit_paid_at")
    private Instant depositPaidAt;

    @Column(name = "expired_at")
    private Instant expiredAt;

    @OneToMany(mappedBy = "booking", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<BookingDetail> details = new ArrayList<>();

    @OneToMany(mappedBy = "booking", cascade = CascadeType.ALL, orphanRemoval = true)
    private List<ServiceOrder> serviceOrders = new ArrayList<>();

    public Booking(Customer customer, LocalDate checkInDate, LocalDate checkOutDate) {
        this.customer = customer;
        this.checkInDate = checkInDate;
        this.checkOutDate = checkOutDate;
        this.status = BookingStatus.PENDING;
        this.bookingCode = "BK-" + UUID.randomUUID().toString().replace("-", "").substring(0, 16).toUpperCase();
    }

    public void addBookingDetail(Room room, double pricePerNight) {
        addBookingDetail(room, pricePerNight, 1);
    }

    public void addBookingDetail(Room room, double pricePerNight, int guestCount) {
        BookingDetail detail = new BookingDetail(this, room, pricePerNight, guestCount);
        this.details.add(detail);
    }

    public void replaceRooms(List<BookingDetail> replacementDetails) {
        if (status != BookingStatus.PENDING && status != BookingStatus.CONFIRMED)
            throw new IllegalStateException("Rooms can only be changed for pending or confirmed bookings");
        this.details.clear();
        for (BookingDetail detail : replacementDetails) {
            detail.setBooking(this);
            this.details.add(detail);
        }
    }

    public void confirm() {
        requireStatus(BookingStatus.PENDING);
        this.status = BookingStatus.CONFIRMED;
        this.confirmedAt = java.time.LocalDateTime.now();
    }

    public void reject() {
        requireStatus(BookingStatus.PENDING);
        this.status = BookingStatus.REJECTED;
    }

    public void checkIn() {
        requireStatus(BookingStatus.CONFIRMED);
        this.status = BookingStatus.CHECKED_IN;
        this.checkedInAt = java.time.LocalDateTime.now();
    }

    public void complete() {
        requireStatus(BookingStatus.CHECKED_IN);
        this.status = BookingStatus.COMPLETED;
        this.checkedOutAt = java.time.LocalDateTime.now();
    }

    public void cancel(String username, String reason) {
        if (status != BookingStatus.PENDING && status != BookingStatus.PENDING_DEPOSIT && status != BookingStatus.PENDING_VERIFICATION && status != BookingStatus.CONFIRMED) {
            throw new IllegalStateException("Only pending or confirmed bookings can be cancelled");
        }
        this.status = BookingStatus.CANCELLED;
        this.cancelledAt = java.time.LocalDateTime.now();
        this.cancelledBy = username;
        this.cancellationReason = reason;
    }

    public void expire(Instant at) {
        boolean depositExpired = status == BookingStatus.PENDING_DEPOSIT && depositDeadline != null && !at.isBefore(depositDeadline);
        boolean verificationExpired = status == BookingStatus.PENDING_VERIFICATION && verificationDeadline != null && !at.isBefore(verificationDeadline);
        if (!depositExpired && !verificationExpired) {
            throw new IllegalStateException("Booking is not eligible for deposit expiration");
        }
        this.status = BookingStatus.EXPIRED;
        this.expiredAt = at;
    }

    private void requireStatus(BookingStatus expected) {
        if (status != expected) throw new IllegalStateException("Booking must be " + expected + " to perform this action");
    }

    public void addServiceOrder(ServiceItem item, int quantity) {
        if (details.size() != 1) throw new IllegalStateException("A booking room must be specified for service usage");
        addServiceOrder(details.getFirst(), item, quantity);
    }

    public ServiceOrder addServiceOrder(BookingDetail bookingDetail, ServiceItem item, int quantity) {
        ServiceOrder order = new ServiceOrder(this, bookingDetail, item, quantity);
        this.serviceOrders.add(order);
        return order;
    }

    public int getNumberOfNights() {
        if (checkInDate == null || checkOutDate == null) return 0;
        int nights = (int) ChronoUnit.DAYS.between(checkInDate, checkOutDate);
        return Math.max(nights, 1);
    }

    public double calculateTotalRoomCharge() {
        int nights = getNumberOfNights();
        return details.stream()
                .mapToDouble(d -> d.getPricePerNight() * nights)
                .sum();
    }

    public double calculateTotalServiceCharge() {
        return serviceOrders.stream()
                .filter(order -> !order.isCancelled() && order.getApprovalStatus() == com.hotel.enums.ServiceOrderStatus.APPROVED)
                .mapToDouble(ServiceOrder::getSubTotal)
                .sum();
    }
}
