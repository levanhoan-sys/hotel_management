package com.hotel.entity;

import jakarta.persistence.*;
import lombok.Getter;
import lombok.NoArgsConstructor;
import org.hibernate.annotations.CreationTimestamp;

import java.math.BigDecimal;
import java.time.Instant;
import java.time.LocalDateTime;

@Entity
@Getter
@NoArgsConstructor
@Table(name = "refunds", indexes = {
        @Index(name = "idx_refunds_booking_status", columnList = "booking_id, status")
})
public class Refund extends BaseEntity {
    @ManyToOne(fetch = FetchType.LAZY, optional = false)
    @JoinColumn(name = "booking_id", nullable = false)
    private Booking booking;

    @Column(name = "code", nullable = false, unique = true, length = 60)
    private String code;

    @Column(nullable = false, precision = 15, scale = 2)
    private BigDecimal amount;

    @Column(nullable = false, length = 20)
    private String status = "PENDING";

    @Column(name = "reference", length = 255)
    private String reference;

    @Column(name = "completed_at")
    private Instant completedAt;

    @CreationTimestamp
    @Column(name = "created_at", nullable = false, updatable = false)
    private LocalDateTime createdAt;

    public Refund(Booking booking, BigDecimal amount) {
        this.booking = booking;
        this.amount = amount;
        this.code = "RF-" + java.util.UUID.randomUUID().toString().replace("-", "").substring(0, 16).toUpperCase();
    }

    public String getProcessingReference() {
        return reference;
    }

    public void complete(String reference) {
        if (!"PENDING".equals(status)) {
            throw new IllegalStateException("Refund has already been processed");
        }
        status = "COMPLETED";
        this.reference = reference;
        completedAt = Instant.now();
    }
}
